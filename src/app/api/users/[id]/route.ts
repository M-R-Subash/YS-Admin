import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const userId = resolvedParams.id;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    if (userId === session.user.id) {
      return NextResponse.json(
        { message: "You cannot delete your own account" },
        { status: 403 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const userId = resolvedParams.id;

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, role, authorRole, description, profilePicture } = body;

    // Safety guard: if admin is editing themselves, prevent self-demotion to EDITOR
    if (userId === session.user.id && role && role !== "ADMIN") {
      return NextResponse.json(
        { message: "You cannot change your own role from Admin to prevent account lockout." },
        { status: 400 }
      );
    }

    // Role validation if provided
    if (role && !["ADMIN", "EDITOR"].includes(role)) {
      return NextResponse.json(
        { message: "Invalid role specified" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name: typeof name === "string" ? name.trim() : name }),
        ...(role !== undefined && { role }),
        ...(authorRole !== undefined && { authorRole: typeof authorRole === "string" ? authorRole.trim() : authorRole }),
        ...(description !== undefined && { description: typeof description === "string" ? description.trim() : description }),
        ...(profilePicture !== undefined && { profilePicture: profilePicture || null }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        authorRole: true,
        description: true,
        profilePicture: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    return NextResponse.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { message },
      { status: 500 }
    );
  }
}
