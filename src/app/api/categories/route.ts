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

const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(60, "Category name too long"),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  metaTitle: z.string().trim().max(100).optional().nullable(),
  metaDesc: z.string().trim().max(300).optional().nullable(),
  focusKeyword: z.string().trim().max(100).optional().nullable(),
  ogImage: z.string().trim().optional().nullable(),
  canonicalUrl: z.string().trim().optional().nullable(),
  noIndex: z.boolean().optional().default(false),
});

// GET /api/categories — List all categories with post counts and SEO data
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

    const categories = await prisma.category.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        metaTitle: true,
        metaDesc: true,
        focusKeyword: true,
        ogImage: true,
        canonicalUrl: true,
        noIndex: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            blogs: {
              where: { isTrashed: false },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const formatted = categories.map((cat) => ({
      ...cat,
      postCount: cat._count.blogs,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return handleApiError(error, "Failed to fetch categories");
  }
}

// POST /api/categories — Create a new category
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guard = await requireLiveUser(session.user?.id);
    if (!guard.authorized) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const body = await request.json();
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const name = parsed.data.name;
    const slug = (parsed.data.slug ? slugify(parsed.data.slug) : slugify(name)) || "category";
    const description = parsed.data.description || null;
    const metaTitle = parsed.data.metaTitle || null;
    const metaDesc = parsed.data.metaDesc || null;
    const focusKeyword = parsed.data.focusKeyword || null;
    const ogImage = parsed.data.ogImage || null;
    const canonicalUrl = parsed.data.canonicalUrl || null;
    const noIndex = Boolean(parsed.data.noIndex);

    // Check duplicate
    const existing = await prisma.category.findFirst({
      where: {
        OR: [{ name: { equals: name, mode: "insensitive" } }, { slug }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Category "${name}" or slug "${slug}" already exists.` },
        { status: 409 }
      );
    }

    const newCategory = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        metaTitle,
        metaDesc,
        focusKeyword,
        ogImage,
        canonicalUrl,
        noIndex,
      },
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error: any) {
    return handleApiError(error, "Failed to create category");
  }
}
