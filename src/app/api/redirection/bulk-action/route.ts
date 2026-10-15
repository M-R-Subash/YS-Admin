import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveUser, requireLiveAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * POST /api/redirection/bulk-action
 * Executes quick multi-row actions from the Table Floating Dock:
 * - "activate": Batch activate selected redirects
 * - "deactivate": Batch deactivate selected redirects
 * - "trash": Soft-delete selected redirects (status = "trashed")
 * - "restore": Restore selected redirects from trash (status = "active")
 * - "deletePermanent": Permanently remove redirects that are already trashed (Admin only)
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
        { error: "No redirection IDs provided for bulk action" },
        { status: 400 }
      );
    }

    // Limit maximum bulk operations to 250 items at a time for database safety
    const targetIds = ids.slice(0, 250);

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
      action,
      count: targetIds.length,
    });
  } catch (error: any) {
    console.error("Redirection bulk-action error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute bulk action" },
      { status: 500 }
    );
  }
}
