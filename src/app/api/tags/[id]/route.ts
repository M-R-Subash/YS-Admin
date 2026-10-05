import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleApiError } from "@/lib/server/prisma-errors";

// DELETE /api/tags/[id] — Delete tag
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guard = await requireLiveUser(session.user?.id);
    if (!guard.authorized) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const { id } = await params;
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: { _count: { select: { blogs: true } } },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Remove from tag string arrays on blogs
    const blogsWithTag = await prisma.blog.findMany({
      where: { tags: { has: tag.name } },
      select: { id: true, tags: true },
    });

    for (const b of blogsWithTag) {
      await prisma.blog.update({
        where: { id: b.id },
        data: {
          tags: (b.tags || []).filter((t) => t !== tag.name),
        },
      });
    }

    // Delete tag record
    await prisma.tag.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Tag "${tag.name}" removed from ${tag._count.blogs} articles.`,
    });
  } catch (error: any) {
    return handleApiError(error, "Failed to delete tag");
  }
}
