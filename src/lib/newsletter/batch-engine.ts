import prisma from "@/lib/prisma";
import { getEmailProvider } from "./email-service";
import { renderBlogNewsletterHtml, renderCustomBlastHtml } from "./templates";
import { serverConfig } from "@/lib/config/server";

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 250; // 250ms pause between 50-email chunks

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Executes a campaign batch in chunks of 50
 */
export async function executeCampaignDispatch(campaignId: string): Promise<{
  success: boolean;
  totalRecipients: number;
  successCount: number;
  failedCount: number;
  error?: string;
}> {
  const campaign = await prisma.newsletterCampaign.findUnique({
    where: { id: campaignId },
    include: {
      blog: {
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featuredImage: true,
          readingTime: true,
          categories: true,
        },
      },
    },
  });

  if (!campaign) {
    return { success: false, totalRecipients: 0, successCount: 0, failedCount: 0, error: "Campaign not found" };
  }

  if (campaign.status === "completed") {
    return {
      success: true,
      totalRecipients: campaign.totalRecipients,
      successCount: campaign.successCount,
      failedCount: campaign.failedCount,
    };
  }

  // 1. Fetch all active subscribers
  const subscribers = await prisma.subscriber.findMany({
    where: { status: "active" },
    select: { id: true, email: true, unsubscribeToken: true },
    orderBy: { createdAt: "asc" },
  });

  if (subscribers.length === 0) {
    await prisma.newsletterCampaign.update({
      where: { id: campaignId },
      data: {
        status: "completed",
        totalRecipients: 0,
        successCount: 0,
        failedCount: 0,
        completedAt: new Date(),
      },
    });
    return { success: true, totalRecipients: 0, successCount: 0, failedCount: 0 };
  }

  // 2. Mark campaign processing and total count
  await prisma.newsletterCampaign.update({
    where: { id: campaignId },
    data: {
      status: "processing",
      totalRecipients: subscribers.length,
    },
  });

  const provider = getEmailProvider();
  const domain = serverConfig.auth.nextAuthUrl.replace(/\/$/, "");

  const chunks = chunkArray(subscribers, BATCH_SIZE);
  let totalSuccess = 0;
  let totalFailed = 0;

  for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
    const chunk = chunks[cIdx];

    const results = await Promise.allSettled(
      chunk.map(async (sub) => {
        const unsubscribeUrl = `${domain}/api/newsletter/unsubscribe?token=${sub.unsubscribeToken}`;

        let html = "";
        if (campaign.type === "BLOG_UPDATE" && campaign.blog) {
          html = renderBlogNewsletterHtml(
            {
              title: campaign.blog.title,
              slug: campaign.blog.slug,
              excerpt: campaign.blog.excerpt,
              featuredImage: campaign.blog.featuredImage,
              readingTime: campaign.blog.readingTime,
              categoryName: campaign.blog.categories?.[0] || null,
            },
            unsubscribeUrl
          );
        } else {
          html = renderCustomBlastHtml(campaign.subject, campaign.bodyHtml, unsubscribeUrl);
        }

        const res = await provider.send({
          to: sub.email,
          subject: campaign.subject,
          html,
          unsubscribeUrl,
        });

        if (!res.success) {
          throw new Error(res.error || "Delivery failed");
        }
        return res;
      })
    );

    let chunkSuccess = 0;
    let chunkFailed = 0;

    results.forEach((r) => {
      if (r.status === "fulfilled") {
        chunkSuccess++;
      } else {
        chunkFailed++;
      }
    });

    totalSuccess += chunkSuccess;
    totalFailed += chunkFailed;

    // Real-time progress update to DB
    await prisma.newsletterCampaign.update({
      where: { id: campaignId },
      data: {
        successCount: totalSuccess,
        failedCount: totalFailed,
      },
    });

    // Pause between batches to avoid flooding
    if (cIdx < chunks.length - 1) {
      await delay(BATCH_DELAY_MS);
    }
  }

  // 3. Finalize campaign
  await prisma.newsletterCampaign.update({
    where: { id: campaignId },
    data: {
      status: "completed",
      completedAt: new Date(),
    },
  });

  // If connected to a blog, mark blog as sent
  if (campaign.blogId) {
    await prisma.blog.update({
      where: { id: campaign.blogId },
      data: {
        newsletterSent: true,
        newsletterSentAt: new Date(),
      },
    });
  }

  return {
    success: true,
    totalRecipients: subscribers.length,
    successCount: totalSuccess,
    failedCount: totalFailed,
  };
}

/**
 * Dispatches an automated blog publication newsletter
 */
export async function dispatchBlogNewsletter(blogId: string): Promise<string | null> {
  const blog = await prisma.blog.findUnique({
    where: { id: blogId },
    select: { id: true, title: true, slug: true, status: true, newsletterSent: true, excerpt: true },
  });

  if (!blog || blog.status !== "published" || blog.newsletterSent) {
    return null;
  }

  // Create Campaign
  const campaign = await prisma.newsletterCampaign.create({
    data: {
      subject: `New Post: ${blog.title}`,
      bodyHtml: blog.excerpt || blog.title,
      type: "BLOG_UPDATE",
      status: "processing",
      blogId: blog.id,
    },
  });

  // Execute in background
  executeCampaignDispatch(campaign.id).catch((err) => {
    console.error(`[Newsletter:Blog:${blog.id}] Dispatch failed:`, err);
  });

  return campaign.id;
}

/**
 * Sends a single test email preview to the admin
 */
export async function sendTestEmail(
  toEmail: string,
  subject: string,
  contentHtml: string
): Promise<{ success: boolean; error?: string }> {
  const provider = getEmailProvider();
  const domain = serverConfig.auth.nextAuthUrl.replace(/\/$/, "");
  const sampleUnsubscribeUrl = `${domain}/api/newsletter/unsubscribe?token=sample-test-token`;

  const html = renderCustomBlastHtml(`[TEST PREVIEW] ${subject}`, contentHtml, sampleUnsubscribeUrl);

  const res = await provider.send({
    to: toEmail,
    subject: `[TEST PREVIEW] ${subject}`,
    html,
    unsubscribeUrl: sampleUnsubscribeUrl,
  });

  return res;
}
