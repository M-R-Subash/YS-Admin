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
    const search = searchParams.get("search")?.trim() || "";
    const filter = searchParams.get("filter") || "all";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "15", 10), 1), 100);
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

    if (search !== "") {
      whereClause.OR = [
        { formName: { contains: search, mode: "insensitive" } },
        { sourceUrl: { contains: search, mode: "insensitive" } },
      ];
    }

    const hasSearch = search !== "";

    // 1 single groupBy aggregate replaces 3 separate count queries
    const [submissions, groupCounts, searchMatchingCount] = await Promise.all([
      prisma.formSubmission.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: skip,
      }),
      prisma.formSubmission.groupBy({
        by: ["isTrashed", "isRead"],
        _count: { _all: true },
      }),
      hasSearch
        ? prisma.formSubmission.count({ where: whereClause })
        : null,
    ]);

    let totalCount = 0;
    let unreadCount = 0;
    let trashedCount = 0;

    for (const group of groupCounts) {
      const count = group._count._all;
      if (group.isTrashed) {
        trashedCount += count;
      } else {
        totalCount += count;
        if (!group.isRead) {
          unreadCount += count;
        }
      }
    }

    const matchingCount = hasSearch
      ? (searchMatchingCount ?? 0)
      : filter === "trashed"
      ? trashedCount
      : filter === "unread"
      ? unreadCount
      : filter === "read"
      ? totalCount - unreadCount
      : totalCount;

    const hasMore = skip + submissions.length < matchingCount;

    return NextResponse.json({
      submissions,
      totalCount,
      unreadCount,
      trashedCount,
      pagination: {
        page,
        limit,
        total: matchingCount,
        hasMore,
        totalPages: Math.ceil(matchingCount / limit),
      },
    });
  } catch (error) {
    console.error("Fetch form submissions error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
