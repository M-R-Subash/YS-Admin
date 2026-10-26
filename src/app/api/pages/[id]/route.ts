import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveAdmin, requireLiveUser } from "@/lib/auth";
import prisma, { mapDbToPageData } from "@/lib/prisma";
import { revalidateFrontendPath } from "@/lib/revalidate";
import { handleApiError } from "@/lib/server/prisma-errors";
import { invalidateAggregateCaches } from "@/lib/server/memory-cache";
import { recordAuditLog, getClientAuditMeta, logEntityMutation } from "@/lib/server/audit";
import { serverConfig } from "@/lib/config/server";
import crypto from "crypto";

// GET /api/pages/[id] — get a single page
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const page = await prisma.page.findUnique({
    where: { id },
    include: {
      seo: true,
      author: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  // Pre-generate short-lived HMAC preview token (15-min validity) to eliminate client preview token waterfalls
  let previewToken: string | undefined = undefined;
  const secretKey = serverConfig.security.previewSecret;
  if (secretKey && page.slug) {
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(`${page.slug}:${expiresAt}`)
      .digest("hex");
    previewToken = `${expiresAt}.${signature}`;
  }

  return NextResponse.json({
    ...mapDbToPageData(page),
    previewToken,
  });
}

// PUT /api/pages/[id] — update a page
export async function PUT(
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
  const existingPage = await prisma.page.findUnique({
    where: { id },
    include: {
      seo: true,
      author: { select: { id: true, name: true, email: true } },
    },
  });
  if (!existingPage) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const body = await request.json();
  const { title, slug, content, isTrashed, action, seo } = body;
  let { status } = body;

  if (isTrashed === true) {
    status = "draft";
  }

  let updateData: any = {
    authorId: session.user.id,
    ...(title !== undefined && { title }),
    ...(slug !== undefined && { slug }),
    ...(isTrashed !== undefined && { isTrashed }),
  };

  // Handle SEO data upsert if provided
  if (seo !== undefined && seo !== null) {
    let parsedStructuredData = seo.structuredData;
    if (typeof parsedStructuredData === "string" && parsedStructuredData.trim()) {
      try {
        parsedStructuredData = JSON.parse(parsedStructuredData);
      } catch {
        parsedStructuredData = null;
      }
    }

    updateData.seo = {
      upsert: {
        create: {
          metaTitle: seo.metaTitle || null,
          metaDesc: seo.metaDesc || null,
          focusKeyword: seo.focusKeyword || null,
          ogImage: seo.ogImage || null,
          ogTitle: seo.ogTitle || null,
          ogDesc: seo.ogDesc || null,
          canonicalUrl: seo.canonicalUrl || null,
          structuredData: parsedStructuredData || null,
          noIndex: Boolean(seo.noIndex),
          authorName: seo.authorName || null,
          authorRole: seo.authorRole || null,
          authorDescription: seo.authorDescription || null,
        },
        update: {
          ...(seo.metaTitle !== undefined && { metaTitle: seo.metaTitle || null }),
          ...(seo.metaDesc !== undefined && { metaDesc: seo.metaDesc || null }),
          ...(seo.focusKeyword !== undefined && { focusKeyword: seo.focusKeyword || null }),
          ...(seo.ogImage !== undefined && { ogImage: seo.ogImage || null }),
          ...(seo.ogTitle !== undefined && { ogTitle: seo.ogTitle || null }),
          ...(seo.ogDesc !== undefined && { ogDesc: seo.ogDesc || null }),
          ...(seo.canonicalUrl !== undefined && { canonicalUrl: seo.canonicalUrl || null }),
          ...(seo.structuredData !== undefined && { structuredData: parsedStructuredData || null }),
          ...(seo.noIndex !== undefined && { noIndex: Boolean(seo.noIndex) }),
          ...(seo.authorName !== undefined && { authorName: seo.authorName || null }),
          ...(seo.authorRole !== undefined && { authorRole: seo.authorRole || null }),
          ...(seo.authorDescription !== undefined && { authorDescription: seo.authorDescription || null }),
        },
      },
    };
  }

  let shouldRevalidate = false;

  if (action === "save-draft") {
    // Only save to draftContent without altering live content or triggering ISR
    updateData = {
      ...updateData,
      draftContent: content !== undefined ? content : body.draftContent,
      ...(status !== undefined && { status }),
    };
  } else if (action === "publish") {
    // Commit to live content, reset draftContent, set status to published, and trigger ISR
    updateData = {
      ...updateData,
      content: content !== undefined ? content : body.draftContent,
      draftContent: null,
      status: "published",
    };
    shouldRevalidate = true;
  } else if (action === "discard-draft") {
    // Clear draftContent, live content remains intact, no ISR
    updateData = {
      ...updateData,
      draftContent: null,
    };
  } else {
    // Standard update
    updateData = {
      ...updateData,
      ...(status !== undefined && { status }),
      ...(content !== undefined && { content }),
      ...(body.draftContent !== undefined && { draftContent: body.draftContent }),
    };
    if (content !== undefined || status === "published") {
      shouldRevalidate = true;
    }
  }

  const page = await prisma.page.update({
    where: { id },
    data: updateData,
    include: {
      seo: true,
      author: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // Revalidate frontend path asynchronously if live content was updated
  if (shouldRevalidate && page.slug) {
    revalidateFrontendPath(page.slug);
  }

  invalidateAggregateCaches();

  // Authoritative Audit Logging with Unified Field-Level Diffs
  await logEntityMutation({
    category: "PAGES",
    before: existingPage,
    after: page,
    userId: session.user.id,
    request,
  });

    return NextResponse.json({
      ...mapDbToPageData(page),
    });
  } catch (error: any) {
    return handleApiError(error, "Failed to update page");
  }
}

// DELETE /api/pages/[id] — delete a page
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const { id } = await params;
  
  // Role-level RBAC: Enforce live database check for Admin role and active account
  const guard = await requireLiveAdmin(session.user.id);
  if (!guard.authorized) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const page = await prisma.page.findUnique({ where: { id } });
  if (!page || !page.isTrashed) {
    return NextResponse.json(
      { error: "Page must be moved to trash before permanent deletion" },
      { status: 400 }
    );
  }

  await prisma.page.delete({ where: { id } });

  invalidateAggregateCaches();

  if (page.slug) {
    revalidateFrontendPath(page.slug);
  }

  const delClientMeta = await getClientAuditMeta(_request);
  await recordAuditLog({
    eventType: "PAGE.PERMANENTLY_DELETED",
    category: "PAGES",
    action: `Permanently deleted page "${page.title}"`,
    target: `Page: ${page.title}`,
    userId: session.user.id,
    status: "WARNING",
    ipAddress: delClientMeta.ipAddress,
    userAgent: delClientMeta.userAgent,
    metadata: {
      pageId: page.id,
      slug: page.slug,
    },
  });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return handleApiError(error, "Failed to delete page");
  }
}
