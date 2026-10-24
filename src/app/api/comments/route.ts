import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const filter = searchParams.get("filter") || "all";
    const blogId = searchParams.get("blogId") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "15", 10), 1), 100);
    const skip = (page - 1) * limit;

    const conditions: any[] = [];

    if (filter === "trashed") {
      conditions.push({ isTrashed: true });
    } else {
      conditions.push({ isTrashed: false });
      if (filter === "pending") {
        conditions.push({
          OR: [
            { isApproved: false },
            { replies: { some: { isApproved: false, isTrashed: false } } },
          ],
        });
      } else if (filter === "approved") {
        conditions.push({ isApproved: true });
      }
    }

    if (blogId && blogId !== "all") {
      conditions.push({ blogId });
    }

    if (search !== "") {
      conditions.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
          { blog: { title: { contains: search, mode: "insensitive" } } },
          {
            replies: {
              some: {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                  { content: { contains: search, mode: "insensitive" } },
                ],
              },
            },
          },
        ],
      });
    }

    const rootWhereClause = {
      parentId: null,
      ...(conditions.length > 0 ? { AND: conditions } : {}),
    };

    const [rootComments, matchingCount, totalCount, unapprovedCount, trashedCount, blogsWithComments] = await Promise.all([
      prisma.comment.findMany({
        where: rootWhereClause,
        include: {
          blog: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
          replies: {
            where: { isTrashed: filter === "trashed" },
            include: {
              blog: { select: { id: true, title: true, slug: true } },
              parent: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: skip,
      }),
      // Count total matching root discussions for this filter & search
      prisma.comment.count({ where: rootWhereClause }),
      // Global header metrics
      prisma.comment.count({ where: { isTrashed: false, parentId: null } }),
      prisma.comment.count({ where: { isTrashed: false, isApproved: false } }),
      prisma.comment.count({ where: { isTrashed: true } }),
      prisma.blog.findMany({
        where: {
          comments: {
            some: {},
          },
        },
        select: {
          id: true,
          title: true,
          slug: true,
          comments: {
            select: {
              parentId: true,
              isApproved: true,
              isTrashed: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    // Flatten root comments and their replies so client receives thread data seamlessly
    const comments = rootComments.flatMap((rc) => {
      const { replies, ...root } = rc;
      return [root, ...(replies || [])];
    });

    // Count top-level root comments for totalComments in sidebar
    const blogsSummary = blogsWithComments.map((b) => ({
      id: b.id,
      title: b.title,
      slug: b.slug,
      totalComments: b.comments.filter((c) => !c.isTrashed && !c.parentId).length,
      pendingComments: b.comments.filter((c) => !c.isTrashed && !c.isApproved).length,
      trashedComments: b.comments.filter((c) => c.isTrashed).length,
    }));

    const hasMore = skip + rootComments.length < matchingCount;

    return NextResponse.json({
      comments,
      totalCount,
      unapprovedCount,
      trashedCount,
      blogsSummary,
      pagination: {
        page,
        limit,
        total: matchingCount,
        hasMore,
        totalPages: Math.ceil(matchingCount / limit),
      },
    });
  } catch (error) {
    console.error("Fetch comments error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { blogId, parentId, content } = body;

    if (!blogId || !content) {
      return NextResponse.json(
        { message: "blogId and content are required" },
        { status: 400 }
      );
    }

    const adminName = session.user.name || "YS Team";
    const adminEmail = session.user.email || "admin@ysinnovations.com";

    const newComment = await prisma.comment.create({
      data: {
        blogId,
        parentId: parentId || null,
        content,
        name: `${adminName} (Admin)`,
        email: adminEmail,
        isApproved: true, // Admin replies are auto-approved
        isTrashed: false,
        isAdmin: true,
      },
      include: {
        blog: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json({ comment: newComment }, { status: 201 });
  } catch (error) {
    console.error("Create admin comment error:", error);
    return NextResponse.json(
      { message: "Failed to post reply" },
      { status: 500 }
    );
  }
}
