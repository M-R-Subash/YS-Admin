import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { invalidateAggregateCaches } from "@/lib/server/memory-cache";
import { revalidateFrontendPath } from "@/lib/revalidate";
import { handleApiError } from "@/lib/server/prisma-errors";

/**
 * GET /api/pages/bulk?ids=id1,id2,...
 * Fetches lightweight, structured spreadsheet data for selected pages.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guard = await requireLiveUser(session.user?.id);
    if (!guard.authorized) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    if (!idsParam) {
      return NextResponse.json({ error: "ids parameter is required" }, { status: 400 });
    }

    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ pages: [] });
    }

    const pages = await prisma.page.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        seo: {
          select: {
            metaTitle: true,
            metaDesc: true,
            focusKeyword: true,
            canonicalUrl: true,
            noIndex: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ pages });
  } catch (error: any) {
    return handleApiError(error, "Failed to fetch pages for bulk edit");
  }
}

/**
 * PATCH /api/pages/bulk
 * Accepts an array of field-level updates and applies them in an atomic transaction.
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
        { error: "No updates provided" },
        { status: 400 }
      );
    }

    // Validate duplicate slugs within the payload
    const slugMap = new Map<string, string>();
    for (const item of updates) {
      if (item.changes?.slug) {
        const s = item.changes.slug.trim().toLowerCase();
        if (slugMap.has(s) && slugMap.get(s) !== item.id) {
          return NextResponse.json(
            { error: `Duplicate slug detected in changes: "${s}"` },
            { status: 400 }
          );
        }
        slugMap.set(s, item.id);
      }
    }

    // Check slug collision against DB pages outside this batch
    const newSlugs = Array.from(slugMap.keys());
    if (newSlugs.length > 0) {
      const colliding = await prisma.page.findMany({
        where: {
          slug: { in: newSlugs },
          id: { notIn: updates.map((u: any) => u.id) },
        },
        select: { slug: true, title: true },
      });

      if (colliding.length > 0) {
        return NextResponse.json(
          {
            error: `Slug "${colliding[0].slug}" already exists on page "${colliding[0].title}".`,
          },
          { status: 400 }
        );
      }
    }

    // Execute atomic batch transaction
    const affectedPageIds: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const updateItem of updates) {
        const { id, changes } = updateItem;
        if (!id || !changes) continue;

        affectedPageIds.push(id);

        const pageData: any = {};
        if (changes.title !== undefined) pageData.title = changes.title;
        if (changes.slug !== undefined) pageData.slug = changes.slug;
        if (changes.status !== undefined) pageData.status = changes.status;

        if (Object.keys(pageData).length > 0) {
          await tx.page.update({
            where: { id },
            data: pageData,
          });
        }

        // Handle SEO fields
        const seoUpdates: any = {};
        if (changes.metaTitle !== undefined) seoUpdates.metaTitle = changes.metaTitle || null;
        if (changes.metaDesc !== undefined) seoUpdates.metaDesc = changes.metaDesc || null;
        if (changes.focusKeyword !== undefined) seoUpdates.focusKeyword = changes.focusKeyword || null;
        if (changes.canonicalUrl !== undefined) seoUpdates.canonicalUrl = changes.canonicalUrl || null;
        if (changes.noIndex !== undefined) seoUpdates.noIndex = Boolean(changes.noIndex);

        if (Object.keys(seoUpdates).length > 0) {
          await tx.seoMeta.upsert({
            where: { pageId: id },
            create: {
              pageId: id,
              ...seoUpdates,
            },
            update: seoUpdates,
          });
        }
      }
    });

    invalidateAggregateCaches();

    // Revalidate affected pages
    try {
      await revalidateFrontendPath("/webpages");
      const updatedPages = await prisma.page.findMany({
        where: { id: { in: affectedPageIds } },
        select: { slug: true },
      });
      for (const p of updatedPages) {
        if (p.slug) {
          const path = p.slug === "/" ? "/" : p.slug.startsWith("/") ? p.slug : `/${p.slug}`;
          await revalidateFrontendPath(path);
        }
      }
    } catch (e) {
      console.warn("[BulkPageUpdate] Revalidation warning:", e);
    }

    return NextResponse.json({
      success: true,
      updatedCount: affectedPageIds.length,
    });
  } catch (error: any) {
    return handleApiError(error, "Failed to apply bulk page updates");
  }
}
