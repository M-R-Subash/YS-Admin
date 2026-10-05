import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { handleApiError } from "@/lib/server/prisma-errors";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60).optional(),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(300).optional().nullable(),
});

// PATCH /api/categories/[id] — Update category details
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
    const parsed = updateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
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

    // Check slug conflict if slug or name is being changed
    if (updateData.slug && updateData.slug !== existing.slug) {
      const conflict = await prisma.category.findFirst({
        where: { slug: updateData.slug, id: { not: id } },
      });
      if (conflict) {
        return NextResponse.json(
          { error: `Slug "${updateData.slug}" is already in use by another category.` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    // Also update any blogs that had this category name if name changed
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const oldName = existing.name;
      const newName = parsed.data.name;
      const blogsWithOldCategory = await prisma.blog.findMany({
        where: { categories: { has: oldName } },
        select: { id: true, categories: true },
      });

      for (const b of blogsWithOldCategory) {
        const updatedCategories = (b.categories || []).map((c) =>
          c.toLowerCase() === oldName.toLowerCase() ? newName : c
        );
        await prisma.blog.update({
          where: { id: b.id },
          data: { categories: updatedCategories },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return handleApiError(error, "Failed to update category");
  }
}

// DELETE /api/categories/[id] — Delete category
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
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { blogs: true } } },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Remove from category string arrays on blogs
    const blogsWithCategory = await prisma.blog.findMany({
      where: { categories: { has: category.name } },
      select: { id: true, categories: true },
    });

    for (const b of blogsWithCategory) {
      await prisma.blog.update({
        where: { id: b.id },
        data: {
          categories: (b.categories || []).filter((c) => c !== category.name),
        },
      });
    }

    // Delete category record (relations in join table are deleted automatically)
    await prisma.category.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Category "${category.name}" removed from ${category._count.blogs} articles.`,
    });
  } catch (error: any) {
    return handleApiError(error, "Failed to delete category");
  }
}
