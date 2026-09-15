import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

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

    // Parse body if present (e.g. { reassignToUserId?: string })
    let reassignToUserId: string | null = null;
    try {
      const body = await request.json();
      if (body && typeof body.reassignToUserId === "string" && body.reassignToUserId.trim()) {
        reassignToUserId = body.reassignToUserId.trim();
      }
    } catch {
      // Body may be empty on standard DELETE requests
    }

    if (reassignToUserId) {
      if (reassignToUserId === userId) {
        return NextResponse.json(
          { message: "Cannot reassign content to the user being deleted" },
          { status: 400 }
        );
      }

      // Verify target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: reassignToUserId },
        select: { id: true, name: true, role: true },
      });

      if (!targetUser) {
        return NextResponse.json(
          { message: "Selected user for reassignment does not exist" },
          { status: 400 }
        );
      }
    }

    // Execute reassignment and deletion atomically
    await prisma.$transaction(async (tx) => {
      if (reassignToUserId) {
        await tx.blog.updateMany({
          where: { authorId: userId },
          data: { authorId: reassignToUserId },
        });

        await tx.page.updateMany({
          where: { authorId: userId },
          data: { authorId: reassignToUserId },
        });
      }

      await tx.user.delete({
        where: { id: userId },
      });
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

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const guard = await requireLiveAdmin(session.user.id);
    if (!guard.authorized) {
      return NextResponse.json({ message: guard.error }, { status: guard.status });
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
    const { name, role, authorRole, description, profilePicture, password } = body;

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

    // Password validation and hashing if provided
    let hashedPassword: string | undefined = undefined;
    if (password) {
      const cleanPassword = String(password).trim();
      if (cleanPassword.length < 8) {
        return NextResponse.json(
          { message: "Password must be at least 8 characters long" },
          { status: 400 }
        );
      }
      if (!/[A-Za-z]/.test(cleanPassword) || !/[0-9]/.test(cleanPassword)) {
        return NextResponse.json(
          { message: "Password must contain both letters and numbers" },
          { status: 400 }
        );
      }
      hashedPassword = await bcrypt.hash(cleanPassword, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name: typeof name === "string" ? name.trim() : name }),
        ...(role !== undefined && { role }),
        ...(authorRole !== undefined && { authorRole: typeof authorRole === "string" ? authorRole.trim() : authorRole }),
        ...(description !== undefined && { description: typeof description === "string" ? description.trim() : description }),
        ...(profilePicture !== undefined && { profilePicture: profilePicture || null }),
        ...(hashedPassword && { password: hashedPassword }),
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
