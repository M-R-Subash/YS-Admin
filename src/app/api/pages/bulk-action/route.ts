import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveUser, requireLiveAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { invalidateAggregateCaches } from "@/lib/server/memory-cache";
import { revalidateFrontendPath } from "@/lib/revalidate";
import { handleApiError } from "@/lib/server/prisma-errors";

/**
 * POST /api/pages/bulk-action
 * Executes quick multi-row actions for Webpages from the Table Floating Dock:
 * - "trash": Soft-delete selected pages
 * - "restore": Restore selected pages from trash
 * - "publish": Batch set status to "published"
 * - "draft": Batch set status to "draft"
 * - "deletePermanent": Permanently remove pages that are in trash (Admin only)
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
        { error: "No page IDs provided for bulk action" },
        { status: 400 }
      );
    }

    const targetIds = ids.slice(0, 250);

    // Fetch existing pages to obtain slugs for cache revalidation
    const existingPages = await prisma.page.findMany({
      where: { id: { in: targetIds } },
      select: { id: true, slug: true, status: true, isTrashed: true },
    });

    if (action === "trash") {
      await prisma.page.updateMany({
        where: { id: { in: targetIds } },
        data: {
          isTrashed: true,
        },
      });
    } else if (action === "restore") {
      await prisma.page.updateMany({
        where: { id: { in: targetIds } },
        data: {
          isTrashed: false,
        },
      });
    } else if (action === "publish" || (action === "setStatus" && status === "published")) {
      await prisma.page.updateMany({
        where: { id: { in: targetIds }, isTrashed: false },
        data: {
          status: "published",
        },
      });
    } else if (action === "draft" || (action === "setStatus" && status === "draft")) {
      await prisma.page.updateMany({
        where: { id: { in: targetIds }, isTrashed: false },
        data: {
          status: "draft",
        },
      });
    } else if (action === "deletePermanent") {
      const adminGuard = await requireLiveAdmin(session.user?.id);
      if (!adminGuard.authorized) {
        return NextResponse.json(
          { error: "Forbidden: Admin privilege required for permanent deletion" },
          { status: 403 }
        );
      }

      await prisma.page.deleteMany({
        where: { id: { in: targetIds }, isTrashed: true },
      });
    } else {
      return NextResponse.json(
        { error: `Unsupported bulk action: ${action}` },
        { status: 400 }
      );
    }

    // Invalidate local in-memory caches
    invalidateAggregateCaches();

    // Revalidate frontend consumer ISR caches
    try {
      await revalidateFrontendPath("/webpages");
      for (const p of existingPages) {
        if (p.slug) {
          const path = p.slug === "/" ? "/" : p.slug.startsWith("/") ? p.slug : `/${p.slug}`;
          await revalidateFrontendPath(path);
        }
      }
    } catch (revalErr) {
      console.warn("[PageBulkAction] Frontend revalidation warning:", revalErr);
    }

    return NextResponse.json({
      success: true,
      action,
      count: existingPages.length,
    });
  } catch (error: any) {
    return handleApiError(error, "Failed to execute page bulk action");
  }
}
