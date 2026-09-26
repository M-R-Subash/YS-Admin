import prisma from "@/lib/prisma";
import { revalidateFrontendPath } from "@/lib/revalidate";

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
  const cronSecret = process.env.CRON_SECRET;

  // In development mode, allow running if no CRON_SECRET is configured yet
  if (process.env.NODE_ENV === "development" && !cronSecret) {
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
    (headerSecret && headerSecret === cronSecret) ||
    (querySecret && querySecret === cronSecret);

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
  if (process.env.CRON_ENABLED === "false") {
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
    },
  });

  if (overdueBlogs.length === 0) {
    return {
      success: true,
      message: "No overdue scheduled blogs found to publish.",
      publishedCount: 0,
      publishedBlogs: [],
      checkedAt: now.toISOString(),
      executionTimeMs: Date.now() - startTime,
    };
  }

  const publishedBlogsList: { id: string; title: string; slug: string }[] = [];

  // 2. Process each overdue blog
  for (const blog of overdueBlogs) {
    // Check if there is staged draftContent to commit into live content
    const stagedDraft = blog.draftContent as any;

    if (stagedDraft && typeof stagedDraft === "object") {
      // Staged changes exist: apply them to live content
      await prisma.blog.update({
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
          scheduledAt: null, // clear schedule timestamp now that it has been executed
        },
      });
      publishedBlogsList.push({
        id: blog.id,
        title: stagedDraft.title || blog.title,
        slug: stagedDraft.slug || blog.slug,
      });
    } else {
      // Standard new scheduled post without separate draftContent
      await prisma.blog.update({
        where: { id: blog.id },
        data: {
          status: "published",
          publishedAt: now,
          scheduledAt: null,
        },
      });
      publishedBlogsList.push({
        id: blog.id,
        title: blog.title,
        slug: blog.slug,
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
