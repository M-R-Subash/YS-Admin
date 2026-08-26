import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, profilePicture } = body;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(profilePicture !== undefined && { profilePicture }),
      },
    });

    return NextResponse.json({
      message: "Account updated successfully",
      user: {
        name: updatedUser.name,
        profilePicture: updatedUser.profilePicture,
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
