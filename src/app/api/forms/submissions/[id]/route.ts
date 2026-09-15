import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveAdmin } from "@/lib/auth";
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
    if (typeof body.isRead === "boolean") dataToUpdate.isRead = body.isRead;
    if (typeof body.isTrashed === "boolean") dataToUpdate.isTrashed = body.isTrashed;

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json(
        { message: "No valid fields provided to update" },
        { status: 400 }
      );
    }

    const updated = await prisma.formSubmission.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ submission: updated });
  } catch (error) {
    console.error("Update form submission error:", error);
    return NextResponse.json(
      { message: "Failed to update submission" },
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

    await prisma.formSubmission.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Submission deleted successfully" });
  } catch (error) {
    console.error("Delete form submission error:", error);
    return NextResponse.json(
      { message: "Failed to delete submission" },
      { status: 500 }
    );
  }
}
