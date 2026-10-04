import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveAdmin } from "@/lib/auth";
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

    const guard = await requireLiveAdmin(session.user?.id);
    if (!guard.authorized) {
      return NextResponse.json(
        { message: guard.error || "Forbidden: Admin access required" },
        { status: guard.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "all";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "100", 10), 1), 250);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (filter === "trashed") {
      whereClause.isTrashed = true;
    } else {
      whereClause.isTrashed = false;
      if (filter === "unread") {
        whereClause.isRead = false;
      } else if (filter === "read") {
        whereClause.isRead = true;
      }
    }

    if (search.trim() !== "") {
      whereClause.OR = [
        { formName: { contains: search, mode: "insensitive" } },
        { sourceUrl: { contains: search, mode: "insensitive" } },
      ];
    }

    const [submissions, totalCount, unreadCount, trashedCount] = await Promise.all([
      prisma.formSubmission.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: skip,
      }),
      prisma.formSubmission.count({ where: { isTrashed: false } }),
      prisma.formSubmission.count({ where: { isTrashed: false, isRead: false } }),
      prisma.formSubmission.count({ where: { isTrashed: true } }),
    ]);

    return NextResponse.json({
      submissions,
      totalCount,
      unreadCount,
      trashedCount,
    });
  } catch (error) {
    console.error("Fetch form submissions error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
