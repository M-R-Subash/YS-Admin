import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { handleApiError } from "@/lib/server/prisma-errors";
import { slugify } from "@/lib/slugify";

const updateTagSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50).optional(),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(300).optional().nullable(),
});

// PATCH /api/tags/[id] — Update tag
export async function PATCH(
  request: Request,
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
    const body = await request.json();
    const parsed = updateTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const updateData: { name?: string; slug?: string; description?: string | null } = {};
    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name;
    }
    if (parsed.data.slug !== undefined) {
      updateData.slug = slugify(parsed.data.slug);
    }
    if (parsed.data.description !== undefined) {
      updateData.description = parsed.data.description;
    }

    if (updateData.slug && updateData.slug !== existing.slug) {
      const conflict = await prisma.tag.findFirst({
        where: { slug: updateData.slug, id: { not: id } },
      });
      if (conflict) {
        return NextResponse.json(
          { error: `Slug "${updateData.slug}" is already in use by another tag.` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.tag.update({
      where: { id },
      data: updateData,
      include: { _count: { select: { blogs: true } } },
    });

    // Also update any blogs that had this tag name if name changed
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const oldName = existing.name;
      const newName = parsed.data.name;
      const blogsWithOldTag = await prisma.blog.findMany({
        where: { tags: { has: oldName } },
        select: { id: true, tags: true },
      });

      for (const b of blogsWithOldTag) {
        const updatedTags = (b.tags || []).map((t) =>
          t.toLowerCase() === oldName.toLowerCase() ? newName : t
        );
        await prisma.blog.update({
          where: { id: b.id },
          data: { tags: updatedTags },
        });
      }
    }

    return NextResponse.json({ ...updated, postCount: updated._count.blogs });
  } catch (error: any) {
    return handleApiError(error, "Failed to update tag");
  }
}

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
