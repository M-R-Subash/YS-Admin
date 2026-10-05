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

const createTagSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required").max(50, "Tag name too long"),
});

// GET /api/tags — Search and list tags (for editor autocomplete & management)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "100", 10), 1), 200);

    const tags = await prisma.tag.findMany({
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
        createdAt: true,
        _count: {
          select: {
            blogs: {
              where: { isTrashed: false },
            },
          },
        },
      },
      orderBy: search ? { name: "asc" } : { blogs: { _count: "desc" } },
      take: limit,
    });

    const formatted = tags.map((t) => ({
      ...t,
      postCount: t._count.blogs,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return handleApiError(error, "Failed to fetch tags");
  }
}

// POST /api/tags — Create a new tag (or return existing)
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
    const parsed = createTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Validation failed" },
        { status: 400 }
      );
    }

    const name = parsed.data.name;
    const slug = slugify(name) || "tag";

    // Upsert so if tag already exists, it returns the existing tag without error
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: {
        name,
        slug,
      },
      include: {
        _count: {
          select: { blogs: true },
        },
      },
    });

    return NextResponse.json({ ...tag, postCount: tag._count.blogs }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error, "Failed to create tag");
  }
}
