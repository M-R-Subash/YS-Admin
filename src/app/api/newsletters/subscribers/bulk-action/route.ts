import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/server/prisma-errors";

/**
 * POST /api/newsletters/subscribers/bulk-action
 * Executes quick multi-row actions for subscribers:
 * - "opt-out": Sets status to "unsubscribed"
 * - "activate": Sets status to "active", increments resubscribeCount
 * - "delete": Permanently deletes subscribers
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
    const { action, ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No subscriber IDs provided for bulk action" },
        { status: 400 }
      );
    }

    const targetIds = ids.slice(0, 500);

    if (action === "opt-out") {
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
    } else if (action === "delete") {
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
      action,
      count: targetIds.length,
    });
  } catch (error: any) {
    return handleApiError(error, "Failed to execute subscriber bulk action");
  }
}
