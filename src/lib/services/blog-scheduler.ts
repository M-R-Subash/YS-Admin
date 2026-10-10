import crypto from "crypto";
import prisma from "@/lib/prisma";
import { revalidateFrontendPath } from "@/lib/revalidate";
import { serverConfig } from "@/lib/config/server";
import { createBlogRevisionSnapshot } from "@/lib/server/revision-utils";

function safeCompareSecret(provided: string | null | undefined, expected: string): boolean {
  if (!provided || !expected) return false;
  const bufProvided = Buffer.from(provided);
  const bufExpected = Buffer.from(expected);
  if (bufProvided.length !== bufExpected.length) return false;
  return crypto.timingSafeEqual(bufProvided, bufExpected);
}

export interface ScheduledExecutionResult {
  success: boolean;
  message: string;
  publishedCount: number;
  publishedBlogs: { id: string; title: string; slug: string }[];
  checkedAt: string;
  executionTimeMs: number;
  disabled?: boolean;
}

/**
 * Verify whether an incoming cron HTTP request is authorized.
 * Supports:
 * 1. Authorization header: "Bearer <SECRET>"
 * 2. Authorization header: "<SECRET>" (direct raw token)
 * 3. URL query parameter: "?secret=<SECRET>"
 */
export function verifyCronAuthorization(req: Request): {
  isAuthorized: boolean;
  reason?: string;
} {
  const cronSecret = serverConfig.cron.secret;

  // In development mode, allow running if no CRON_SECRET is configured yet
  if (serverConfig.isDevelopment && !cronSecret) {
    return { isAuthorized: true };
  }

  if (!cronSecret) {
    return {
      isAuthorized: false,
      reason: "CRON_SECRET is not configured on the server environment.",
    };
  }

  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get("secret")?.trim();
  const authHeader = req.headers.get("authorization")?.trim();

  // Support both "Bearer <token>" and raw token in Authorization header
  let headerSecret: string | null = null;
  if (authHeader) {
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      headerSecret = authHeader.slice(7).trim();
    } else {
      headerSecret = authHeader;
    }
  }

  const matches =
    safeCompareSecret(headerSecret, cronSecret) ||
    safeCompareSecret(querySecret, cronSecret);

  if (!matches) {
    return {
      isAuthorized: false,
      reason: "Invalid or missing secret credentials.",
    };
  }

  return { isAuthorized: true };
}

/**
 * Core Reusable Service: Publish all overdue scheduled blogs.
 * Handles both:
 * 1. New blogs scheduled for publishing (status = "scheduled", scheduledAt <= now)
 * 2. Existing published blogs that scheduled an update (status = "published", scheduledAt <= now, draftContent != null)
 */
export async function publishOverdueBlogs(): Promise<ScheduledExecutionResult> {
  const startTime = Date.now();
  const now = new Date();

  // Check if cron execution is globally disabled via environment variable
  if (!serverConfig.cron.enabled) {
    return {
      success: false,
      disabled: true,
      message: "Scheduled publishing is disabled via CRON_ENABLED=false.",
      publishedCount: 0,
      publishedBlogs: [],
      checkedAt: now.toISOString(),
      executionTimeMs: Date.now() - startTime,
    };
  }

  // 1. Find all non-trashed blogs scheduled for now or earlier
  const overdueBlogs = await prisma.blog.findMany({
    where: {
      isTrashed: false,
      scheduledAt: { lte: now },
      OR: [
        { status: "scheduled" },
        {
          status: "published",
          draftContent: { not: null as any },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      draftContent: true,
      scheduledAt: true,
      notifyNewsletter: true,
      newsletterSent: true,
    },
  });

  if (overdueBlogs.length === 0) {
    // Even if no blogs to publish, check for overdue scheduled newsletter campaigns
    try {
      const { dispatchOverdueScheduledCampaigns } = await import("@/lib/newsletter/batch-engine");
      dispatchOverdueScheduledCampaigns().catch((campErr) => {
        console.warn("[SCHEDULER] Scheduled campaigns dispatch warning:", campErr);
      });
    } catch {}

    return {
      success: true,
      message: "No overdue scheduled blogs found to publish.",
      publishedCount: 0,
      publishedBlogs: [],
      checkedAt: now.toISOString(),
      executionTimeMs: Date.now() - startTime,
    };
  }

  const publishedBlogsList: {
    id: string;
    title: string;
    slug: string;
    shouldNotifyNewsletter: boolean;
  }[] = [];

  // 2. Process each overdue blog
  for (const blog of overdueBlogs) {
    // Check if there is staged draftContent to commit into live content
    const stagedDraft = blog.draftContent as any;

    if (stagedDraft && typeof stagedDraft === "object") {
      // Staged changes exist: apply them to live content
      const updated = await prisma.blog.update({
        where: { id: blog.id },
        data: {
          ...(stagedDraft.title && { title: stagedDraft.title }),
          ...(stagedDraft.slug && { slug: stagedDraft.slug }),
          ...(stagedDraft.content !== undefined && { content: stagedDraft.content }),
          ...(stagedDraft.excerpt !== undefined && { excerpt: stagedDraft.excerpt }),
          ...(stagedDraft.featuredImage !== undefined && {
            featuredImage: stagedDraft.featuredImage,
          }),
          ...(stagedDraft.allowComments !== undefined && {
            allowComments: stagedDraft.allowComments,
          }),
          ...(stagedDraft.tags !== undefined && { tags: stagedDraft.tags }),
          ...(stagedDraft.categories !== undefined && {
            categories: stagedDraft.categories,
          }),
          status: "published",
          publishedAt: blog.status === "scheduled" ? now : undefined, // only update publishedAt if first time
          draftContent: null as any,
          notifyNewsletter: false,
          // Retain scheduledAt timestamp so historical release record remains in Scheduled Actions
        },
        include: { seo: true },
      });

      try {
        await createBlogRevisionSnapshot({
          blogId: updated.id,
          payload: {
            title: updated.title,
            slug: updated.slug,
            content: updated.content,
            excerpt: updated.excerpt,
            featuredImage: updated.featuredImage,
            allowComments: updated.allowComments,
            readingTime: updated.readingTime,
            tags: updated.tags,
            categories: updated.categories,
            faqs: (updated.content as any)?.faqs || [],
            seo: updated.seo,
          },
          action: "scheduled-publish",
          savedById: updated.authorId,
        });
      } catch (revError) {
        console.warn("[SCHEDULER] Failed to create revision snapshot:", revError);
      }

      const shouldNotify = Boolean((stagedDraft as any)?.sendNewsletter ?? blog.notifyNewsletter);
      publishedBlogsList.push({
        id: blog.id,
        title: stagedDraft.title || blog.title,
        slug: stagedDraft.slug || blog.slug,
        shouldNotifyNewsletter: shouldNotify && !blog.newsletterSent,
      });
    } else {
      // Standard new scheduled post without separate draftContent
      const updated = await prisma.blog.update({
        where: { id: blog.id },
        data: {
          status: "published",
          publishedAt: now,
          notifyNewsletter: false,
          // Retain scheduledAt timestamp so historical release record remains in Scheduled Actions
        },
        include: { seo: true },
      });

      try {
        await createBlogRevisionSnapshot({
          blogId: updated.id,
          payload: {
            title: updated.title,
            slug: updated.slug,
            content: updated.content,
            excerpt: updated.excerpt,
            featuredImage: updated.featuredImage,
            allowComments: updated.allowComments,
            readingTime: updated.readingTime,
            tags: updated.tags,
            categories: updated.categories,
            faqs: (updated.content as any)?.faqs || [],
            seo: updated.seo,
          },
          action: "scheduled-publish",
          savedById: updated.authorId,
        });
      } catch (revError) {
        console.warn("[SCHEDULER] Failed to create revision snapshot:", revError);
      }

      publishedBlogsList.push({
        id: blog.id,
        title: blog.title,
        slug: blog.slug,
        shouldNotifyNewsletter: Boolean(blog.notifyNewsletter) && !blog.newsletterSent,
      });
    }
  }

  // 3. Purge Next.js ISR caches on main.ys
  try {
    await revalidateFrontendPath("/blogs");
    for (const blog of publishedBlogsList) {
      if (blog.slug) {
        await revalidateFrontendPath(`/blogs/${blog.slug}`);
      }
    }
  } catch (revalError) {
    console.warn("[SCHEDULER] Revalidation warning:", revalError);
  }

  // 4. Trigger newsletter dispatch only for scheduled blogs that explicitly opted in
  try {
    const { dispatchBlogNewsletter, dispatchOverdueScheduledCampaigns } = await import(
      "@/lib/newsletter/batch-engine"
    );
    for (const blog of publishedBlogsList) {
      if (blog.shouldNotifyNewsletter) {
        dispatchBlogNewsletter(blog.id).catch((nlErr) => {
          console.warn(`[SCHEDULER] Newsletter dispatch warning for blog ${blog.id}:`, nlErr);
        });
      }
    }

    // 5. Trigger dispatch for overdue scheduled newsletter campaigns
    dispatchOverdueScheduledCampaigns().catch((campErr) => {
      console.warn("[SCHEDULER] Scheduled campaigns dispatch warning:", campErr);
    });
  } catch (nlImportErr) {
    console.warn("[SCHEDULER] Newsletter import warning:", nlImportErr);
  }

  return {
    success: true,
    message: `Successfully published ${publishedBlogsList.length} scheduled blog${
      publishedBlogsList.length > 1 ? "s" : ""
    }!`,
    publishedCount: publishedBlogsList.length,
    publishedBlogs: publishedBlogsList,
    checkedAt: now.toISOString(),
    executionTimeMs: Date.now() - startTime,
  };
}
