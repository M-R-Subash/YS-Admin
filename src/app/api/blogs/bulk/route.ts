import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { invalidateAggregateCaches } from "@/lib/server/memory-cache";
import { revalidateFrontendPath } from "@/lib/revalidate";
import { handleApiError } from "@/lib/server/prisma-errors";

/**
 * GET /api/blogs/bulk?ids=id1,id2,id3
 * Fetches the selected blogs with their fields and SEO metadata for the Spreadsheet Bulk Editor.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids") || "";
    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ blogs: [] });
    }

    const blogs = await prisma.blog.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        seo: true,
        author: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ blogs });
  } catch (error: any) {
    return handleApiError(error, "Failed to fetch blogs for bulk edit");
  }
}

/**
 * PATCH /api/blogs/bulk
 * Commits multi-row spreadsheet edits in a single atomic transaction.
 *
 * Body format:
 * {
 *   updates: [
 *     {
 *       id: "...",
 *       changes: {
 *         title?: string;
 *         slug?: string;
 *         status?: "published" | "draft" | "scheduled";
 *         categories?: string[];
 *         tags?: string[];
 *         allowComments?: boolean;
 *         readingTime?: number;
 *         metaTitle?: string;
 *         metaDesc?: string;
 *         focusKeyword?: string;
 *       }
 *     }
 *   ]
 * }
 */
export async function PATCH(request: Request) {
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
    const { updates } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "No updates array provided" },
        { status: 400 }
      );
    }

    // Safety cap: max 100 rows per spreadsheet save
    const batchUpdates = updates.slice(0, 100);

    // Validate for duplicate slugs within the submitted batch
    const submittedSlugs = batchUpdates
      .map((u) => u.changes?.slug?.trim().toLowerCase())
      .filter(Boolean);
    const uniqueSlugs = new Set(submittedSlugs);
    if (uniqueSlugs.size !== submittedSlugs.length) {
      return NextResponse.json(
        { error: "Duplicate slugs detected within the bulk update list. Each slug must be unique." },
        { status: 400 }
      );
    }

    // Fetch existing records to check slug uniqueness against other blogs in DB
    const targetIds = batchUpdates.map((u) => u.id);
    const existingBlogs = await prisma.blog.findMany({
      where: { id: { in: targetIds } },
      select: { id: true, slug: true, status: true },
    });

    const existingMap = new Map(existingBlogs.map((b) => [b.id, b]));

    // Check if any changed slug conflicts with existing blogs not in this batch
    for (const update of batchUpdates) {
      const newSlug = update.changes?.slug?.trim();
      const existing = existingMap.get(update.id);
      if (newSlug && existing && newSlug !== existing.slug) {
        const conflict = await prisma.blog.findFirst({
          where: {
            slug: newSlug,
            id: { not: update.id },
          },
          select: { id: true, title: true },
        });

        if (conflict) {
          return NextResponse.json(
            { error: `Slug "${newSlug}" is already in use by blog "${conflict.title}".` },
            { status: 409 }
          );
        }
      }
    }

    // Execute atomic batch updates
    const affectedSlugs: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const update of batchUpdates) {
        const { id, changes } = update;
        if (!changes || Object.keys(changes).length === 0) continue;

        const existing = existingMap.get(id);
        if (existing?.slug) affectedSlugs.push(existing.slug);

        const blogData: any = {};
        const seoData: any = {};

        // Extract primary blog fields
        if (changes.title !== undefined) blogData.title = String(changes.title).trim();
        if (changes.slug !== undefined) {
          const cleanSlug = String(changes.slug).trim().toLowerCase();
          blogData.slug = cleanSlug;
          affectedSlugs.push(cleanSlug);
        }
        if (changes.status !== undefined) {
          blogData.status = changes.status;
          if (changes.status === "published" && existing?.status !== "published") {
            blogData.publishedAt = new Date();
            blogData.scheduledAt = null;
          }
        }
        if (changes.categories !== undefined && Array.isArray(changes.categories)) {
          blogData.categories = changes.categories;
        }
        if (changes.tags !== undefined && Array.isArray(changes.tags)) {
          blogData.tags = changes.tags;
        }
        if (changes.allowComments !== undefined) {
          blogData.allowComments = Boolean(changes.allowComments);
        }
        if (changes.readingTime !== undefined) {
          blogData.readingTime = Math.max(1, parseInt(String(changes.readingTime), 10) || 1);
        }
        if (changes.featuredImage !== undefined) {
          blogData.featuredImage = changes.featuredImage ? String(changes.featuredImage).trim() : null;
        }
        if (changes.excerpt !== undefined) {
          blogData.excerpt = changes.excerpt ? String(changes.excerpt).trim() : null;
        }

        // Extract SEO fields
        if (changes.metaTitle !== undefined) seoData.metaTitle = String(changes.metaTitle).trim();
        if (changes.metaDesc !== undefined) seoData.metaDesc = String(changes.metaDesc).trim();
        if (changes.focusKeyword !== undefined) seoData.focusKeyword = String(changes.focusKeyword).trim();
        if (changes.canonicalUrl !== undefined) {
          seoData.canonicalUrl = changes.canonicalUrl ? String(changes.canonicalUrl).trim() : null;
        }
        if (changes.noIndex !== undefined) seoData.noIndex = Boolean(changes.noIndex);

        // Update Blog row if any primary fields changed
        if (Object.keys(blogData).length > 0) {
          await tx.blog.update({
            where: { id },
            data: blogData,
          });
        }

        // Update or upsert SeoMeta if any SEO fields changed
        if (Object.keys(seoData).length > 0) {
          await tx.seoMeta.upsert({
            where: { blogId: id },
            create: {
              blogId: id,
              ...seoData,
            },
            update: seoData,
          });
        }
      }
    });

    // Invalidate local in-memory aggregates
    invalidateAggregateCaches();

    // Revalidate frontend ISR caches
    try {
      await revalidateFrontendPath("/blogs");
      for (const slug of Array.from(new Set(affectedSlugs))) {
        if (slug) await revalidateFrontendPath(`/blogs/${slug}`);
      }
    } catch (revalErr) {
      console.warn("[BulkEdit] Frontend revalidation warning:", revalErr);
    }

    return NextResponse.json({
      success: true,
      updatedCount: batchUpdates.length,
    });
  } catch (error: any) {
    return handleApiError(error, "Failed to save bulk changes");
  }
}
