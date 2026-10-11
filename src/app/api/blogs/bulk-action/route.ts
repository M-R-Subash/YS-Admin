import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveUser, requireLiveAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { invalidateAggregateCaches } from "@/lib/server/memory-cache";
import { revalidateFrontendPath } from "@/lib/revalidate";
import { handleApiError } from "@/lib/server/prisma-errors";

/**
 * POST /api/blogs/bulk-action
 * Executes quick multi-row actions from the Table Floating Dock:
 * - "trash": Soft-delete selected blogs
 * - "restore": Restore selected blogs from trash
 * - "setStatus": Batch set status to "published" or "draft"
 * - "deletePermanent": Permanently remove blogs that are already in trash (Admin only)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guard = await requireLiveUser(session.user?.id);
    if (!guard.authorized) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const body = await request.json();
    const { action, ids, status } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No blog IDs provided for bulk action" },
        { status: 400 }
      );
    }

    // Limit maximum bulk operations to 250 items at a time for database safety
    const targetIds = ids.slice(0, 250);

    // Fetch existing blogs to obtain slugs for cache revalidation
    const existingBlogs = await prisma.blog.findMany({
      where: { id: { in: targetIds } },
      select: { id: true, slug: true, status: true, isTrashed: true },
    });

    if (action === "trash") {
      await prisma.blog.updateMany({
        where: { id: { in: targetIds } },
        data: {
          isTrashed: true,
          scheduledAt: null,
        },
      });
    } else if (action === "restore") {
      await prisma.blog.updateMany({
        where: { id: { in: targetIds } },
        data: {
          isTrashed: false,
        },
      });
    } else if (action === "publish" || (action === "setStatus" && status === "published")) {
      await prisma.blog.updateMany({
        where: { id: { in: targetIds }, isTrashed: false },
        data: {
          status: "published",
          publishedAt: new Date(),
          scheduledAt: null,
        },
      });
    } else if (action === "draft" || (action === "setStatus" && status === "draft")) {
      await prisma.blog.updateMany({
        where: { id: { in: targetIds }, isTrashed: false },
        data: {
          status: "draft",
          scheduledAt: null,
        },
      });
    } else if (action === "setStatus") {
      return NextResponse.json(
        { error: "Invalid status. Allowed values: published, draft" },
        { status: 400 }
      );
    } else if (action === "deletePermanent") {
      const adminGuard = await requireLiveAdmin(session.user?.id);
      if (!adminGuard.authorized) {
        return NextResponse.json(
          { error: "Forbidden: Admin privilege required for permanent deletion" },
          { status: 403 }
        );
      }

      // Only delete blogs that are already in trash
      await prisma.blog.deleteMany({
        where: { id: { in: targetIds }, isTrashed: true },
      });
    } else {
      return NextResponse.json(
        { error: `Unsupported bulk action: ${action}` },
        { status: 400 }
      );
    }

    // Invalidate local in-memory aggregation caches (badges, dashboard stats)
    invalidateAggregateCaches();

    // Revalidate frontend consumer ISR caches
    try {
      await revalidateFrontendPath("/blogs");
      for (const b of existingBlogs) {
        if (b.slug) {
          await revalidateFrontendPath(`/blogs/${b.slug}`);
        }
      }
    } catch (revalErr) {
      console.warn("[BulkAction] Frontend revalidation warning:", revalErr);
    }

    return NextResponse.json({
      success: true,
      action,
      count: existingBlogs.length,
    });
  } catch (error: any) {
    return handleApiError(error, "Failed to execute bulk action");
  }
}
