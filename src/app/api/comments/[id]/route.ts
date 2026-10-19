import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { invalidateAggregateCaches } from "@/lib/server/memory-cache";
import { recordAuditLog, getClientAuditMeta } from "@/lib/server/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const guard = await requireLiveAdmin(session.user.id);
    if (!guard.authorized) {
      return NextResponse.json({ message: guard.error }, { status: guard.status });
    }

    const { id } = await params;
    const body = await request.json();

    const dataToUpdate: any = {};
    if (typeof body.isApproved === "boolean") {
      dataToUpdate.isApproved = body.isApproved;
    }
    if (typeof body.isTrashed === "boolean") {
      dataToUpdate.isTrashed = body.isTrashed;
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: dataToUpdate,
      include: {
        blog: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    invalidateAggregateCaches();

    const clientMeta = await getClientAuditMeta(request);
    let eventType = "COMMENT.UPDATED";
    let actionDesc = `Updated comment on blog "${updated.blog?.title || "Unknown"}"`;

    if (body.isApproved === true) {
      eventType = "COMMENT.APPROVED";
      actionDesc = `Approved comment by "${updated.name}" on "${updated.blog?.title || "Blog"}"`;
    } else if (body.isApproved === false) {
      eventType = "COMMENT.UNAPPROVED";
      actionDesc = `Unapproved comment by "${updated.name}" on "${updated.blog?.title || "Blog"}"`;
    } else if (body.isTrashed === true) {
      eventType = "COMMENT.TRASHED";
      actionDesc = `Moved comment by "${updated.name}" to trash`;
    } else if (body.isTrashed === false) {
      eventType = "COMMENT.RESTORED";
      actionDesc = `Restored comment by "${updated.name}" from trash`;
    }

    await recordAuditLog({
      eventType,
      category: "COMMENTS",
      action: actionDesc,
      target: `Comment: ${updated.name}`,
      userId: session.user.id,
      status: "SUCCESS",
      ipAddress: clientMeta.ipAddress,
      userAgent: clientMeta.userAgent,
      metadata: {
        commentId: updated.id,
        blogTitle: updated.blog?.title,
        isApproved: updated.isApproved,
        isTrashed: updated.isTrashed,
      },
    });

    return NextResponse.json({ comment: updated });
  } catch (error) {
    console.error("Update comment error:", error);
    return NextResponse.json(
      { message: "Failed to update comment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const guard = await requireLiveAdmin(session.user.id);
    if (!guard.authorized) {
      return NextResponse.json({ message: guard.error }, { status: guard.status });
    }

    const { id } = await params;

    const existingComment = await prisma.comment.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        blog: { select: { title: true } },
      },
    });

    // Permanently delete comment
    await prisma.comment.delete({
      where: { id },
    });

    invalidateAggregateCaches();

    const clientMeta = await getClientAuditMeta(request);
    await recordAuditLog({
      eventType: "COMMENT.PERMANENTLY_DELETED",
      category: "COMMENTS",
      action: `Permanently deleted comment by "${existingComment?.name || id}"`,
      target: `Comment: ${existingComment?.name || id}`,
      userId: session.user.id,
      status: "WARNING",
      ipAddress: clientMeta.ipAddress,
      userAgent: clientMeta.userAgent,
      metadata: {
        commentId: id,
        blogTitle: existingComment?.blog?.title,
      },
    });

    return NextResponse.json({ message: "Comment permanently deleted" });
  } catch (error) {
    console.error("Delete comment error:", error);
    return NextResponse.json(
      { message: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
