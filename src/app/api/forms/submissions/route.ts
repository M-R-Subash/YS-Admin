import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "all";

    const whereClause: any = {};

    if (filter === "unread") {
      whereClause.isRead = false;
    } else if (filter === "read") {
      whereClause.isRead = true;
    }

    if (search.trim() !== "") {
      whereClause.OR = [
        { formName: { contains: search, mode: "insensitive" } },
        { sourceUrl: { contains: search, mode: "insensitive" } },
      ];
    }

    const [submissions, totalCount, unreadCount] = await Promise.all([
      prisma.formSubmission.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
      }),
      prisma.formSubmission.count(),
      prisma.formSubmission.count({ where: { isRead: false } }),
    ]);

    return NextResponse.json({
      submissions,
      totalCount,
      unreadCount,
    });
  } catch (error) {
    console.error("Fetch form submissions error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
