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
import { getPageZodSchema } from "@/lib/schemas/page-schema-resolver";
import { seoMetadataSchema } from "@/lib/schemas/seo-validation";

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

  const targetSlug = slug !== undefined ? slug : existingPage.slug;

  // Protect Root Homepage from renaming, trashing, or unpublishing
  if (existingPage.slug === "/") {
    if (slug !== undefined && slug !== "/") {
      return NextResponse.json(
        { error: "The Homepage slug is protected and cannot be changed." },
        { status: 400 }
      );
    }
    if (isTrashed === true) {
      return NextResponse.json(
        { error: "The Homepage is a protected core system page and cannot be moved to trash." },
        { status: 400 }
      );
    }
    if (status === "draft" && action !== "save-draft") {
      return NextResponse.json(
        { error: "The Homepage must remain published to keep the website online." },
        { status: 400 }
      );
    }
  }

  // 1. Strict Server-Side Validation for SEO Metadata (if provided)
  if (seo !== undefined && seo !== null) {
    const seoValidation = seoMetadataSchema.safeParse(seo);
    if (!seoValidation.success) {
      const errorMsg = seoValidation.error.issues
        .map((i) => `${i.path.join(".") || "seo"}: ${i.message}`)
        .join("; ");
      return NextResponse.json(
        {
          error: `SEO metadata validation failed: ${errorMsg}`,
          details: seoValidation.error.issues,
        },
        { status: 400 }
      );
    }
  }

  // 2. Strict Server-Side Validation for Page Content
  const isPublishing =
    action === "publish" ||
    status === "published" ||
    (status === undefined &&
      existingPage.status === "published" &&
      content !== undefined &&
      action !== "save-draft" &&
      action !== "discard-draft");

  if (isPublishing) {
    const publishContent =
      content !== undefined
        ? content
        : body.draftContent !== undefined
        ? body.draftContent
        : (existingPage.draftContent ?? existingPage.content);

    if (!publishContent || typeof publishContent !== "object") {
      return NextResponse.json(
        { error: "Cannot publish page: Content is missing or invalid." },
        { status: 400 }
      );
    }

    const pageSchema = getPageZodSchema(targetSlug);
    const contentValidation = pageSchema.safeParse(publishContent);
    if (!contentValidation.success) {
      const errorMsg = contentValidation.error.issues
        .map((i) => `${i.path.join(".") || "content"}: ${i.message}`)
        .join("; ");
      return NextResponse.json(
        {
          error: `Page validation failed: ${errorMsg}`,
          details: contentValidation.error.issues,
        },
        { status: 400 }
      );
    }
  } else if (action === "save-draft" || body.draftContent !== undefined) {
    const draftPayload = content !== undefined ? content : body.draftContent;
    if (draftPayload !== undefined && draftPayload !== null) {
      if (typeof draftPayload !== "object") {
        return NextResponse.json(
          { error: "Draft content must be a valid JSON object." },
          { status: 400 }
        );
      }

      // Check max payload size (max 2MB) to prevent Postgres JSON bloat or memory exhaustion
      const payloadSize = Buffer.byteLength(
        JSON.stringify(draftPayload),
        "utf8"
      );
      if (payloadSize > 2 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Draft payload exceeds the maximum 2MB size limit." },
          { status: 400 }
        );
      }
    }
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
      content:
        content !== undefined
          ? content
          : body.draftContent !== undefined
          ? body.draftContent
          : (existingPage.draftContent ?? existingPage.content),
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
  if (shouldRevalidate) {
    if (page.slug) {
      revalidateFrontendPath(page.slug);
    }
    if (existingPage.slug && existingPage.slug !== page.slug) {
      revalidateFrontendPath(existingPage.slug);
    }
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
  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  if (page.slug === "/") {
    return NextResponse.json(
      { error: "The Homepage is a protected core system page and cannot be permanently deleted." },
      { status: 403 }
    );
  }

  if (!page.isTrashed) {
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
