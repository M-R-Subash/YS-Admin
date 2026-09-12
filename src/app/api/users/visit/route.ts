import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    if (!userId && !userEmail) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.update({
      where: userId ? { id: userId } : { email: userEmail! },
      data: { lastLogin: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update last login visit error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
