import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { publishOverdueBlogs } from "@/lib/services/blog-scheduler";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Fetch non-trashed blogs that actually involve scheduling:
    // 1. Currently scheduled (status: "scheduled")
    // 2. Previously scheduled and released (scheduledAt != null)
    // 3. Staged updates awaiting scheduled publish
    // Fetch non-trashed blogs and newsletter campaigns that involve scheduling:
    const [blogs, stagedBlogRecords, campaigns] = await Promise.all([
      prisma.blog.findMany({
        where: {
          isTrashed: false,
          OR: [
            { status: "scheduled" },
            { scheduledAt: { not: null } },
          ],
        },
        select: {
          id: true,
          title: true,
          slug: true,
          featuredImage: true,
          status: true,
          scheduledAt: true,
          publishedAt: true,
          updatedAt: true,
          categories: true,
          tags: true,
          notifyNewsletter: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true,
            },
          },
        },
        orderBy: [
          { updatedAt: "desc" },
        ],
        take: 100,
      }),
      prisma.blog.findMany({
        where: {
          isTrashed: false,
          status: "published",
          scheduledAt: { not: null },
          draftContent: { not: null as any },
        },
        select: { id: true },
      }),
      prisma.newsletterCampaign.findMany({
        where: {
          OR: [
            { status: "scheduled" },
            { scheduledAt: { not: null } },
          ],
        },
        select: {
          id: true,
          subject: true,
          type: true,
          status: true,
          scheduledAt: true,
          completedAt: true,
          createdAt: true,
          totalRecipients: true,
          successCount: true,
          failedCount: true,
          blog: {
            select: { id: true, title: true, slug: true },
          },
        },
        orderBy: [
          { createdAt: "desc" },
        ],
        take: 100,
      }),
    ]);

    const stagedBlogIds = new Set(stagedBlogRecords.map((b) => b.id));

    // Annotate blog items with schedule category and status
    const blogItems = blogs.map((blog) => {
      let scheduleState: "upcoming" | "pending" | "failed" | "success" = "upcoming";
      const hasStagedUpdate = blog.status === "published" && stagedBlogIds.has(blog.id) && Boolean(blog.scheduledAt);

      if (blog.status === "scheduled" || hasStagedUpdate) {
        if (!blog.scheduledAt) {
          scheduleState = "pending";
        } else {
          const scheduleTime = new Date(blog.scheduledAt).getTime();
          const diffMs = now.getTime() - scheduleTime;

          if (diffMs > 10 * 60 * 1000) {
            scheduleState = "failed";
          } else if (diffMs >= 0) {
            scheduleState = "pending";
          } else {
            scheduleState = "upcoming";
          }
        }
      } else if (blog.status === "published" && blog.scheduledAt) {
        scheduleState = "success";
      } else {
        scheduleState = "upcoming";
      }

      return {
        id: blog.id,
        itemType: "blog" as const,
        title: blog.title,
        slug: blog.slug,
        featuredImage: blog.featuredImage,
        status: blog.status,
        scheduledAt: blog.scheduledAt ? blog.scheduledAt.toISOString() : null,
        publishedAt: blog.publishedAt ? blog.publishedAt.toISOString() : null,
        updatedAt: blog.updatedAt.toISOString(),
        categories: blog.categories,
        tags: blog.tags,
        author: blog.author,
        scheduleState,
        hasStagedUpdate,
        notifyNewsletter: Boolean(blog.notifyNewsletter),
      };
    });

    // Annotate newsletter campaigns with schedule category and status
    const campaignItems = campaigns.map((camp) => {
      let scheduleState: "upcoming" | "pending" | "failed" | "success" = "upcoming";

      if (camp.status === "scheduled") {
        if (!camp.scheduledAt) {
          scheduleState = "pending";
        } else {
          const scheduleTime = new Date(camp.scheduledAt).getTime();
          const diffMs = now.getTime() - scheduleTime;

          if (diffMs > 10 * 60 * 1000) {
            scheduleState = "failed";
          } else if (diffMs >= 0) {
            scheduleState = "pending";
          } else {
            scheduleState = "upcoming";
          }
        }
      } else if (camp.status === "completed") {
        scheduleState = "success";
      } else if (camp.status === "failed") {
        scheduleState = "failed";
      } else if (camp.status === "processing") {
        scheduleState = "pending";
      }

      return {
        id: camp.id,
        itemType: "newsletter" as const,
        title: camp.subject,
        slug: camp.blog?.slug || "newsletters/campaigns",
        featuredImage: null,
        status: camp.status,
        scheduledAt: camp.scheduledAt ? camp.scheduledAt.toISOString() : null,
        publishedAt: camp.completedAt ? camp.completedAt.toISOString() : null,
        updatedAt: camp.createdAt.toISOString(),
        categories: [camp.type === "BLOG_UPDATE" ? "Blog Newsletter" : "Custom Blast"],
        tags: [],
        author: {
          id: "newsletter-bot",
          name: "Newsletter Dispatcher",
          email: "newsletter@ysinnovations.com",
          profilePicture: null,
        },
        scheduleState,
        hasStagedUpdate: false,
        notifyNewsletter: false,
        newsletterInfo: {
          type: camp.type,
          totalRecipients: camp.totalRecipients,
          successCount: camp.successCount,
          failedCount: camp.failedCount,
        },
      };
    });

    const items = [...blogItems, ...campaignItems];

    // Smart priority sorting:
    // 1. Attention required first: failed (red) -> pending (amber)
    // 2. Upcoming next (chronological - soonest scheduled target first)
    // 3. Success last (most recently published/updated first)
    items.sort((a, b) => {
      const priority = { failed: 0, pending: 1, upcoming: 2, success: 3 };
      const rankA = priority[a.scheduleState] ?? 4;
      const rankB = priority[b.scheduleState] ?? 4;

      if (rankA !== rankB) return rankA - rankB;

      if (a.scheduleState === "upcoming" && b.scheduleState === "upcoming") {
        const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        return timeA - timeB;
      }

      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : new Date(a.updatedAt).getTime();
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });

    const counts = {
      all: items.length,
      upcoming: items.filter((i) => i.scheduleState === "upcoming").length,
      pending: items.filter((i) => i.scheduleState === "pending").length,
      failed: items.filter((i) => i.scheduleState === "failed").length,
      success: items.filter((i) => i.scheduleState === "success").length,
      blogs: items.filter((i) => i.itemType === "blog").length,
      newsletters: items.filter((i) => i.itemType === "newsletter").length,
    };

    return NextResponse.json({
      items,
      counts,
      serverTime: now.toISOString(),
    });
  } catch (error: any) {
    console.error("GET /api/scheduled-actions error:", error);
    return NextResponse.json(
      { message: "Failed to fetch scheduled actions", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scheduled-actions
 * Trigger immediate execution of scheduled publishing on-demand from the admin dashboard.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const result = await publishOverdueBlogs();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    console.error("POST /api/scheduled-actions error:", error);
    return NextResponse.json(
      { message: "Failed to trigger scheduled publish", error: error.message },
      { status: 500 }
    );
  }
}
