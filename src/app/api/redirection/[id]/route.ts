import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH /api/redirection/[id] - Update status or edit fields
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.redirection.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Redirection not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.redirection.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.statusCode && { statusCode: body.statusCode }),
        ...(body.destinationUrl && { destinationUrl: body.destinationUrl }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Failed to update redirection:", error);
    return NextResponse.json(
      { error: "Failed to update redirection" },
      { status: 500 }
    );
  }
}

// DELETE /api/redirection/[id] - Permanently delete redirection record
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.redirection.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete redirection:", error);
    return NextResponse.json(
      { error: "Failed to delete redirection" },
      { status: 500 }
    );
  }
}
