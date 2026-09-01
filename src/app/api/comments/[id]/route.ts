import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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

    const { id } = await params;

    // Permanently delete comment
    await prisma.comment.delete({
      where: { id },
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
