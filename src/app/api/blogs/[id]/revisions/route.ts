import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/blogs/[id]/revisions — List all revision summaries for a blog
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify blog exists and check access
    const blog = await prisma.blog.findUnique({
      where: { id },
      select: { id: true, isTrashed: true },
    });

    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    // Retrieve lightweight revision list (omitting heavy snapshotData)
    const revisions = await prisma.blogRevision.findMany({
      where: { blogId: id },
      orderBy: { versionNumber: "desc" },
      take: 30,
      select: {
        id: true,
        blogId: true,
        versionNumber: true,
        action: true,
        wordCount: true,
        readingTime: true,
        createdAt: true,
        savedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    return NextResponse.json({
      revisions,
      total: revisions.length,
    });
  } catch (error) {
    console.error("[API] GET /api/blogs/[id]/revisions error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
