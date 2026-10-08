import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { status } = body;

    if (status !== "active" && status !== "unsubscribed") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await prisma.subscriber.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, subscriber: updated });
  } catch (error) {
    console.error("[API:Newsletters:Subscribers:PATCH] Error:", error);
    return NextResponse.json({ error: "Failed to update subscriber" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.subscriber.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Subscriber deleted successfully" });
  } catch (error) {
    console.error("[API:Newsletters:Subscribers:DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to delete subscriber" }, { status: 500 });
  }
}
