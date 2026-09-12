import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const isUserAdmin = session.user.role === "ADMIN";
    const [unreadSubmissions, pendingComments] = await Promise.all([
      prisma.formSubmission.count({
        where: { isTrashed: false, isRead: false },
      }),
      isUserAdmin
        ? prisma.comment.count({
            where: { isTrashed: false, isApproved: false },
          })
        : Promise.resolve(0),
    ]);

    return NextResponse.json({
      unreadSubmissions,
      pendingComments,
    });
  } catch (error: any) {
    console.error("Badges count fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch badge counts", error: error.message },
      { status: 500 }
    );
  }
}
