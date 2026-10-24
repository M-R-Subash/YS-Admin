import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma, { mapDbToPageData } from "@/lib/prisma";

// GET /api/pages — list all pages with pagination, search, and counts
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const search = searchParams.get("search")?.trim();
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");
  const MAX_LIMIT = 200;
  const isAll = searchParams.get("all") === "true" || limitParam === "all";
  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const limit = isAll ? MAX_LIMIT : Math.min(Math.max(1, parseInt(limitParam || "15", 10) || 15), 100);
  const skip = isAll ? 0 : (page - 1) * limit;

  const whereClause: any = {};
  if (statusParam === "trash" || statusParam === "trashed") {
    whereClause.isTrashed = true;
  } else if (statusParam === "published" || statusParam === "PUBLISHED") {
    whereClause.isTrashed = false;
    whereClause.status = "published";
  } else if (statusParam === "draft" || statusParam === "DRAFT") {
    whereClause.isTrashed = false;
    whereClause.status = "draft";
  } else {
    whereClause.isTrashed = false;
  }

  const hasSearch = Boolean(search);
  if (hasSearch) {
    whereClause.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }

  // Single aggregate groupBy replaces 4 separate count queries
  const [pages, groupCounts, searchMatchingCount] = await Promise.all([
    prisma.page.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        isTrashed: true,
        createdAt: true,
        updatedAt: true,
        seo: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.page.groupBy({
      by: ["isTrashed", "status"],
      _count: { _all: true },
    }),
    hasSearch ? prisma.page.count({ where: whereClause }) : null,
  ]);
  
  let totalCount = 0;
  let publishedCount = 0;
  let draftCount = 0;
  let trashedCount = 0;

  for (const group of groupCounts) {
    const count = group._count._all;
    if (group.isTrashed) {
      trashedCount += count;
    } else {
      totalCount += count;
      if (group.status === "published") publishedCount += count;
      else if (group.status === "draft") draftCount += count;
    }
  }

  const isTrashFilter = statusParam === "trash" || statusParam === "trashed";
  const isPublishedFilter = statusParam === "published" || statusParam === "PUBLISHED";
  const isDraftFilter = statusParam === "draft" || statusParam === "DRAFT";

  const matchingCount = hasSearch
    ? (searchMatchingCount ?? 0)
    : isTrashFilter
    ? trashedCount
    : isPublishedFilter
    ? publishedCount
    : isDraftFilter
    ? draftCount
    : totalCount;

  const mappedPages = pages.map(mapDbToPageData);
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(matchingCount / limit));

  return NextResponse.json({
    pages: mappedPages,
    totalCount: matchingCount,
    counts: {
      total: totalCount,
      published: publishedCount,
      draft: draftCount,
      trashed: trashedCount,
    },
    pagination: {
      page: isAll ? 1 : page,
      limit: isAll ? matchingCount : limit,
      total: matchingCount,
      totalPages,
      hasMore: isAll ? false : skip + pages.length < matchingCount,
    },
  });
}
