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

    // Fetch all non-trashed blogs that either:
    // 1. Are currently scheduled (status: "scheduled")
    // 2. Have a scheduledAt timestamp (to show history of scheduled releases)
    // 3. Are published (to show completed successful releases in the Success tab)
    const blogs = await prisma.blog.findMany({
      where: {
        isTrashed: false,
        OR: [
          { status: "scheduled" },
          { scheduledAt: { not: null } },
          { status: "published" },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        featuredImage: true,
        status: true,
        draftContent: true,
        scheduledAt: true,
        publishedAt: true,
        updatedAt: true,
        categories: true,
        tags: true,
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
    });

    // Annotate items with accurate schedule category and status
    const items = blogs.map((blog) => {
      let scheduleState: "upcoming" | "pending" | "failed" | "success" = "upcoming";
      const hasStagedUpdate = blog.status === "published" && Boolean(blog.draftContent) && Boolean(blog.scheduledAt);

      if (blog.status === "scheduled" || hasStagedUpdate) {
        if (!blog.scheduledAt) {
          scheduleState = "pending";
        } else {
          const scheduleTime = new Date(blog.scheduledAt).getTime();
          const diffMs = now.getTime() - scheduleTime;

          if (diffMs > 10 * 60 * 1000) {
            // Overdue by more than 10 minutes: cron trigger missed / failed
            scheduleState = "failed";
          } else if (diffMs >= 0) {
            // Due right now (within 10-minute window waiting for cron execution)
            scheduleState = "pending";
          } else {
            // In the future
            scheduleState = "upcoming";
          }
        }
      } else if (blog.status === "published") {
        scheduleState = "success";
      } else {
        scheduleState = "upcoming";
      }

      return {
        id: blog.id,
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
      };
    });

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
