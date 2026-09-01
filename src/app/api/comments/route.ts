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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "all";
    const blogId = searchParams.get("blogId") || undefined;

    const whereClause: any = {};

    if (filter === "trashed") {
      whereClause.isTrashed = true;
    } else {
      whereClause.isTrashed = false;
      if (filter === "pending") {
        whereClause.isApproved = false;
      } else if (filter === "approved") {
        whereClause.isApproved = true;
      }
    }

    if (blogId && blogId !== "all") {
      whereClause.blogId = blogId;
    }

    if (search.trim() !== "") {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { blog: { title: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [comments, totalCount, unapprovedCount, trashedCount, blogsWithComments] = await Promise.all([
      prisma.comment.findMany({
        where: whereClause,
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
        },
        orderBy: { createdAt: "desc" },
      }),
      // Count only top-level (root) comments for total count to exclude admin replies
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

    // Count top-level root comments for totalComments in sidebar
    const blogsSummary = blogsWithComments.map((b) => ({
      id: b.id,
      title: b.title,
      slug: b.slug,
      totalComments: b.comments.filter((c) => !c.isTrashed && !c.parentId).length,
      pendingComments: b.comments.filter((c) => !c.isTrashed && !c.isApproved).length,
      trashedComments: b.comments.filter((c) => c.isTrashed).length,
    }));

    return NextResponse.json({
      comments,
      totalCount,
      unapprovedCount,
      trashedCount,
      blogsSummary,
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
