import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        description: true,
        authorRole: true,
        profilePicture: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Account fetch error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { name, profilePicture, description, authorRole } = body;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(profilePicture !== undefined && { profilePicture }),
        ...(description !== undefined && { description }),
        ...(authorRole !== undefined && { authorRole }),
      },
    });

    return NextResponse.json({
      message: "Account updated successfully",
      user: {
        name: updatedUser.name,
        profilePicture: updatedUser.profilePicture,
        description: updatedUser.description,
        authorRole: updatedUser.authorRole,
      },
    });
  } catch (error) {
    console.error("Account update error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
