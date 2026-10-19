import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveUser, requireLiveAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { invalidateAggregateCaches } from "@/lib/server/memory-cache";
import { revalidateFrontendPath } from "@/lib/revalidate";
import { handleApiError } from "@/lib/server/prisma-errors";
import { recordAuditLog, getClientAuditMeta } from "@/lib/server/audit";

export type BulkActionEntity =
  | "blogs"
  | "pages"
  | "webpages"
  | "redirection"
  | "redirections"
  | "redirects"
  | "subscribers"
  | "categories"
  | "tags";

export interface BulkActionRequestPayload {
  entity?: BulkActionEntity;
  action: string;
  ids: string[];
  status?: string;
}

/**
 * Universal Bulk Action Executor
 * Consolidates all entity-specific quick bulk actions (publish, draft, trash, restore, activate, delete)
 * into a single unified server handler with safety limits, live user verification, and admin guards.
 */
export async function executeBulkAction(
  request: Request,
  overrideEntity?: BulkActionEntity
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guard = await requireLiveUser(session.user?.id);
    if (!guard.authorized) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const body: BulkActionRequestPayload = await request.json().catch(() => ({}));
    const { action, ids, status } = body;
    const rawEntity = overrideEntity || body.entity;

    if (!rawEntity) {
      return NextResponse.json(
        { error: "No entity specified for bulk action" },
        { status: 400 }
      );
    }

    const entity = rawEntity.toLowerCase() as BulkActionEntity;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: `No IDs provided for ${entity} bulk action` },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: "No action provided for bulk operation" },
        { status: 400 }
      );
    }

    // Safety limits: max 500 for subscribers, 250 for others to prevent database overload
    const maxBatchSize = entity === "subscribers" ? 500 : 250;
    const targetIds = ids.slice(0, maxBatchSize);

    // ==========================================
    // 1. BLOGS
    // ==========================================
    if (entity === "blogs") {
      const existingBlogs = await prisma.blog.findMany({
        where: { id: { in: targetIds } },
        select: { id: true, slug: true, status: true, isTrashed: true },
      });

      if (action === "trash") {
        await prisma.blog.updateMany({
          where: { id: { in: targetIds } },
          data: { isTrashed: true, scheduledAt: null },
        });
      } else if (action === "restore") {
        await prisma.blog.updateMany({
          where: { id: { in: targetIds } },
          data: { isTrashed: false },
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

        await prisma.blog.deleteMany({
          where: { id: { in: targetIds }, isTrashed: true },
        });
      } else {
        return NextResponse.json(
          { error: `Unsupported bulk action: ${action}` },
          { status: 400 }
        );
      }

      invalidateAggregateCaches();

      try {
        await revalidateFrontendPath("/blogs");
        for (const blog of existingBlogs) {
          if (blog.slug) {
            await revalidateFrontendPath(`/blogs/${blog.slug}`);
          }
        }
      } catch (e) {
        console.warn("Bulk blog revalidation warning:", e);
      }

      const clientMeta = await getClientAuditMeta(request);
      await recordAuditLog({
        eventType: `BLOG.BULK_${action.toUpperCase()}`,
        category: "BLOGS",
        action: `Bulk ${action} applied to ${targetIds.length} blog(s)`,
        target: `${targetIds.length} blogs`,
        userId: session.user.id,
        status: action === "deletePermanent" ? "WARNING" : "SUCCESS",
        ipAddress: clientMeta.ipAddress,
        userAgent: clientMeta.userAgent,
        metadata: {
          action,
          targetIds,
        },
      });

      return NextResponse.json({
        success: true,
        entity,
        action,
        count: targetIds.length,
      });
    }

    // ==========================================
    // 2. PAGES / WEBPAGES
    // ==========================================
    if (entity === "pages" || entity === "webpages") {
      const existingPages = await prisma.page.findMany({
        where: { id: { in: targetIds } },
        select: { id: true, slug: true, status: true, isTrashed: true },
      });

      if (action === "trash") {
        await prisma.page.updateMany({
          where: { id: { in: targetIds } },
          data: { isTrashed: true },
        });
      } else if (action === "restore") {
        await prisma.page.updateMany({
          where: { id: { in: targetIds } },
          data: { isTrashed: false },
        });
      } else if (action === "publish" || (action === "setStatus" && status === "published")) {
        await prisma.page.updateMany({
          where: { id: { in: targetIds }, isTrashed: false },
          data: { status: "published" },
        });
      } else if (action === "draft" || (action === "setStatus" && status === "draft")) {
        await prisma.page.updateMany({
          where: { id: { in: targetIds }, isTrashed: false },
          data: { status: "draft" },
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

      invalidateAggregateCaches();

      try {
        await revalidateFrontendPath("/webpages");
        for (const page of existingPages) {
          if (page.slug) {
            await revalidateFrontendPath(`/${page.slug}`);
          }
        }
      } catch (e) {
        console.warn("Bulk page revalidation warning:", e);
      }

      const clientMeta = await getClientAuditMeta(request);
      await recordAuditLog({
        eventType: `PAGE.BULK_${action.toUpperCase()}`,
        category: "PAGES",
        action: `Bulk ${action} applied to ${targetIds.length} page(s)`,
        target: `${targetIds.length} pages`,
        userId: session.user.id,
        status: action === "deletePermanent" ? "WARNING" : "SUCCESS",
        ipAddress: clientMeta.ipAddress,
        userAgent: clientMeta.userAgent,
        metadata: {
          action,
          targetIds,
        },
      });

      return NextResponse.json({
        success: true,
        entity,
        action,
        count: targetIds.length,
      });
    }

    // ==========================================
    // 3. REDIRECTIONS
    // ==========================================
    if (
      entity === "redirection" ||
      entity === "redirections" ||
      entity === "redirects"
    ) {
      if (action === "trash") {
        await prisma.redirection.updateMany({
          where: { id: { in: targetIds } },
          data: { status: "trashed" },
        });
      } else if (action === "restore") {
        await prisma.redirection.updateMany({
          where: { id: { in: targetIds } },
          data: { status: "active" },
        });
      } else if (action === "activate" || (action === "setStatus" && status === "active")) {
        await prisma.redirection.updateMany({
          where: { id: { in: targetIds }, status: { not: "trashed" } },
          data: { status: "active" },
        });
      } else if (action === "deactivate" || (action === "setStatus" && status === "inactive")) {
        await prisma.redirection.updateMany({
          where: { id: { in: targetIds }, status: { not: "trashed" } },
          data: { status: "inactive" },
        });
      } else if (action === "setStatus") {
        return NextResponse.json(
          { error: "Invalid status. Allowed values: active, inactive" },
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

        await prisma.redirection.deleteMany({
          where: { id: { in: targetIds }, status: "trashed" },
        });
      } else {
        return NextResponse.json(
          { error: `Unsupported bulk action: ${action}` },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        entity,
        action,
        count: targetIds.length,
      });
    }

    // ==========================================
    // 4. SUBSCRIBERS
    // ==========================================
    if (entity === "subscribers") {
      if (action === "opt-out" || action === "deactivate") {
        await prisma.subscriber.updateMany({
          where: { id: { in: targetIds } },
          data: { status: "unsubscribed" },
        });
      } else if (action === "activate") {
        await prisma.subscriber.updateMany({
          where: { id: { in: targetIds } },
          data: {
            status: "active",
            resubscribedAt: new Date(),
            resubscribeCount: { increment: 1 },
          },
        });
      } else if (action === "delete" || action === "deletePermanent") {
        const adminGuard = await requireLiveAdmin(session.user?.id);
        if (!adminGuard.authorized) {
          return NextResponse.json(
            { error: "Forbidden: Admin privilege required to delete subscribers" },
            { status: 403 }
          );
        }

        await prisma.subscriber.deleteMany({
          where: { id: { in: targetIds } },
        });
      } else {
        return NextResponse.json(
          { error: `Unsupported bulk action: ${action}` },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        entity,
        action,
        count: targetIds.length,
      });
    }

    // ==========================================
    // 5. CATEGORIES (Bulk Delete)
    // ==========================================
    if (entity === "categories") {
      if (action === "delete" || action === "deletePermanent") {
        const adminGuard = await requireLiveAdmin(session.user?.id);
        if (!adminGuard.authorized) {
          return NextResponse.json(
            { error: "Forbidden: Admin privilege required to delete categories" },
            { status: 403 }
          );
        }

        await prisma.category.deleteMany({
          where: { id: { in: targetIds } },
        });

        invalidateAggregateCaches();

        return NextResponse.json({
          success: true,
          entity,
          action,
          count: targetIds.length,
        });
      }

      return NextResponse.json(
        { error: `Unsupported bulk action: ${action}` },
        { status: 400 }
      );
    }

    // ==========================================
    // 6. TAGS (Bulk Delete)
    // ==========================================
    if (entity === "tags") {
      if (action === "delete" || action === "deletePermanent") {
        const adminGuard = await requireLiveAdmin(session.user?.id);
        if (!adminGuard.authorized) {
          return NextResponse.json(
            { error: "Forbidden: Admin privilege required to delete tags" },
            { status: 403 }
          );
        }

        await prisma.tag.deleteMany({
          where: { id: { in: targetIds } },
        });

        invalidateAggregateCaches();

        return NextResponse.json({
          success: true,
          entity,
          action,
          count: targetIds.length,
        });
      }

      return NextResponse.json(
        { error: `Unsupported bulk action: ${action}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: `Unknown entity: ${rawEntity}` },
      { status: 400 }
    );
  } catch (error: any) {
    return handleApiError(error, `Failed to execute bulk action for ${overrideEntity || "entity"}`);
  }
}
