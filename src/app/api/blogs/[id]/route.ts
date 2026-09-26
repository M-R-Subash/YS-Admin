import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  blogDraftSchema,
  blogPublishSchema,
  blogScheduleSchema,
} from "@/lib/schemas/blog/blog-validation";
import { revalidateFrontendPath } from "@/lib/revalidate";

// GET /api/blogs/[id] — get a single blog
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const blog = await prisma.blog.findUnique({
    where: { id },
    include: { seo: true },
  });

  if (!blog) {
    return NextResponse.json({ error: "Blog not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...blog,
    previewSecret: process.env.PREVIEW_SECRET || "",
  });
}

// PUT /api/blogs/[id] — update a blog
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existingBlog = await prisma.blog.findUnique({ where: { id } });
  if (!existingBlog) {
    return NextResponse.json({ error: "Blog not found" }, { status: 404 });
  }


  const body = await request.json();
  const {
    title,
    slug,
    content,
    isTrashed,
    featuredImage,
    allowComments,
    tags,
    categories,
    excerpt,
    metaTitle,
    metaDesc,
    focusKeyword,
    ogImage,
    ogTitle,
    ogDesc,
    canonicalUrl,
    noIndex,
    structuredData,
    authorName,
    authorRole,
    authorDescription,
    action,
  } = body;
  let { status } = body;

  // Validate action payload with Zod
  if (action === "publish" || (action === "publish-now" && Boolean(body.title && body.content))) {
    const validation = blogPublishSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          message: validation.error.issues[0]?.message || "Validation failed", 
          errors: validation.error.issues 
        },
        { status: 400 }
      );
    }
  } else if (action === "schedule") {
    // If scheduling an existing published blog, we validate using draft schema so it doesn't break live status
    const validation = existingBlog.status === "published" 
      ? blogDraftSchema.safeParse(body)
      : blogScheduleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          message: validation.error.issues[0]?.message || "Validation failed", 
          errors: validation.error.issues 
        },
        { status: 400 }
      );
    }
  } else if (action === "save-draft") {
    const validation = blogDraftSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          message: validation.error.issues[0]?.message || "Validation failed", 
          errors: validation.error.issues 
        },
        { status: 400 }
      );
    }
  }

  // Check unique slug conflict if slug is being updated
  if (slug && slug !== existingBlog.slug) {
    const slugConflict = await prisma.blog.findFirst({
      where: { slug, id: { not: id } },
    });
    if (slugConflict) {
      return NextResponse.json(
        { message: "A blog with this slug already exists. Please choose a different title or edit the slug." },
        { status: 400 }
      );
    }
  }

  if (isTrashed === true) {
    status = "draft";
  }
  
  if (action === "schedule") {
    // Keep scheduledAt intact for scheduling
  } else if (status === "published" || action === "publish" || action === "publish-now") {
    body.publishedAt = new Date().toISOString();
    body.scheduledAt = null;
  } else if (status === "draft" || action === "cancel-schedule") {
    body.publishedAt = null;
    body.scheduledAt = null;
  }

  let parsedStructuredData = structuredData;
  if (typeof structuredData === "string" && structuredData.trim()) {
    try {
      parsedStructuredData = JSON.parse(structuredData);
    } catch {
      parsedStructuredData = null;
    }
  }

  // Handle SEO data if any SEO field is provided
  const hasSeoFields =
    metaTitle !== undefined ||
    metaDesc !== undefined ||
    focusKeyword !== undefined ||
    ogImage !== undefined ||
    ogTitle !== undefined ||
    ogDesc !== undefined ||
    canonicalUrl !== undefined ||
    noIndex !== undefined ||
    structuredData !== undefined ||
    authorName !== undefined ||
    authorRole !== undefined ||
    authorDescription !== undefined;

  const seoData = hasSeoFields
    ? {
        upsert: {
          create: {
            metaTitle: metaTitle || "",
            metaDesc: metaDesc || "",
            focusKeyword: focusKeyword || "",
            ogImage: ogImage || "",
            ogTitle: ogTitle || "",
            ogDesc: ogDesc || "",
            canonicalUrl: canonicalUrl || "",
            noIndex: Boolean(noIndex),
            structuredData: (parsedStructuredData as any) || null,
            authorName: authorName || null,
            authorRole: authorRole || null,
            authorDescription: authorDescription || null,
          },
          update: {
            ...(metaTitle !== undefined && { metaTitle }),
            ...(metaDesc !== undefined && { metaDesc }),
            ...(focusKeyword !== undefined && { focusKeyword }),
            ...(ogImage !== undefined && { ogImage }),
            ...(ogTitle !== undefined && { ogTitle }),
            ...(ogDesc !== undefined && { ogDesc }),
            ...(canonicalUrl !== undefined && { canonicalUrl }),
            ...(noIndex !== undefined && { noIndex }),
            ...(structuredData !== undefined && { structuredData: (parsedStructuredData as any) || null }),
            ...(authorName !== undefined && { authorName }),
            ...(authorRole !== undefined && { authorRole }),
            ...(authorDescription !== undefined && { authorDescription }),
          },
        },
      }
    : undefined;

  let updateData: any = {
    ...(isTrashed !== undefined && { isTrashed }),
    ...(seoData && { seo: seoData }),
    ...(body.publishedAt !== undefined && { publishedAt: body.publishedAt }),
    ...(body.scheduledAt !== undefined && {
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
    }),
  };

  let shouldRevalidate = false;

  if (action === "save-draft") {
    // Only save to draftContent without altering live content
    updateData = {
      ...updateData,
      draftContent: body,
      status: existingBlog.status === "published" ? "published" : (status || "draft"),
    };
  } else if (action === "schedule") {
    // Schedule post
    const scheduleDate = body.scheduledAt ? new Date(body.scheduledAt) : null;
    const isPastSchedule = scheduleDate && scheduleDate.getTime() <= Date.now();

    if (existingBlog.status === "published" && !isPastSchedule) {
      // EXISTING PUBLISHED BLOG:
      // The current version stays live! New edits are staged in draftContent with scheduledAt.
      updateData = {
        ...updateData,
        draftContent: body,
        status: "published",
        scheduledAt: scheduleDate,
      };
    } else {
      // DRAFT or NEW BLOG:
      updateData = {
        ...updateData,
        ...(title !== undefined && { title }),
        ...(slug !== undefined && { slug }),
        ...(content !== undefined && { content }),
        ...(featuredImage !== undefined && { featuredImage }),
        ...(allowComments !== undefined && { allowComments }),
        ...(tags !== undefined && { tags }),
        ...(categories !== undefined && { categories }),
        ...(excerpt !== undefined && { excerpt }),
        draftContent: null,
        status: isPastSchedule ? "published" : "scheduled",
        scheduledAt: isPastSchedule ? null : scheduleDate,
        publishedAt: isPastSchedule ? (existingBlog.publishedAt || new Date()) : null,
      };
      if (isPastSchedule) {
        shouldRevalidate = true;
      }
    }
  } else if (action === "publish-now") {
    // Immediate publishing: promote staged draftContent if present, flip status to published
    const stagedDraft = existingBlog.draftContent as any;
    updateData = {
      ...updateData,
      status: "published",
      publishedAt: existingBlog.publishedAt || new Date(),
      scheduledAt: null,
      draftContent: null,
    };
    if (stagedDraft && typeof stagedDraft === "object") {
      updateData = {
        ...updateData,
        ...(stagedDraft.title && { title: stagedDraft.title }),
        ...(stagedDraft.slug && { slug: stagedDraft.slug }),
        ...(stagedDraft.content !== undefined && { content: stagedDraft.content }),
        ...(stagedDraft.excerpt !== undefined && { excerpt: stagedDraft.excerpt }),
        ...(stagedDraft.featuredImage !== undefined && { featuredImage: stagedDraft.featuredImage }),
        ...(stagedDraft.allowComments !== undefined && { allowComments: stagedDraft.allowComments }),
        ...(stagedDraft.tags !== undefined && { tags: stagedDraft.tags }),
        ...(stagedDraft.categories !== undefined && { categories: stagedDraft.categories }),
      };
    } else if (title && content) {
      updateData = {
        ...updateData,
        title,
        slug,
        content,
        featuredImage,
        allowComments,
        tags,
        categories,
        excerpt,
      };
    }
    shouldRevalidate = true;
  } else if (action === "publish") {
    // Commit to live content, reset draftContent & scheduledAt
    updateData = {
      ...updateData,
      title,
      slug,
      content,
      featuredImage,
      allowComments,
      tags,
      categories,
      excerpt,
      draftContent: null,
      status: "published",
      scheduledAt: null,
      publishedAt: new Date(),
    };
    shouldRevalidate = true;
  } else if (action === "cancel-schedule") {
    if (existingBlog.status === "published") {
      // If it was already published, cancelling schedule simply clears the schedule and staged draftContent!
      updateData = {
        ...updateData,
        status: "published",
        scheduledAt: null,
        draftContent: null,
      };
    } else {
      // Revert scheduled post back to draft
      updateData = {
        ...updateData,
        status: "draft",
        scheduledAt: null,
      };
    }
  } else if (action === "discard-draft") {
    // Clear draftContent, live content remains intact
    updateData = {
      ...updateData,
      draftContent: null,
    };
  } else {
    // Standard update
    // Check edge case: If updating a scheduled post whose schedule time already elapsed, auto-publish
    let resolvedStatus = status;
    if (
      (status === "scheduled" || existingBlog.status === "scheduled") &&
      (body.scheduledAt || existingBlog.scheduledAt)
    ) {
      const scheduleTime = new Date(body.scheduledAt || existingBlog.scheduledAt!).getTime();
      if (scheduleTime <= Date.now()) {
        resolvedStatus = "published";
        updateData.publishedAt = new Date();
        updateData.scheduledAt = null;
        shouldRevalidate = true;
      }
    }

    updateData = {
      ...updateData,
      ...(title !== undefined && { title }),
      ...(slug !== undefined && { slug }),
      ...(resolvedStatus !== undefined && { status: resolvedStatus }),
      ...(content !== undefined && { content }),
      ...(featuredImage !== undefined && { featuredImage }),
      ...(allowComments !== undefined && { allowComments }),
      ...(tags !== undefined && { tags }),
      ...(categories !== undefined && { categories }),
      ...(excerpt !== undefined && { excerpt }),
      ...(body.draftContent !== undefined && { draftContent: body.draftContent }),
    };
    if (content !== undefined || resolvedStatus === "published" || existingBlog.status === "published") {
      shouldRevalidate = true;
    }
  }

  const blog = await prisma.blog.update({
    where: { id },
    data: updateData,
    include: { seo: true }
  });

  // Revalidate blog listing and blog single page
  if (shouldRevalidate) {
    revalidateFrontendPath("/blogs");
    if (blog.slug) {
      revalidateFrontendPath(`/blogs/${blog.slug}`);
    }
  }

  return NextResponse.json(blog);
}

// DELETE /api/blogs/[id] — delete a blog
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  
  const blog = await prisma.blog.findUnique({ where: { id } });
  if (!blog) {
    return NextResponse.json({ error: "Blog not found" }, { status: 404 });
  }

  // Role-level RBAC: Enforce live database check for Admin role and active account
  const guard = await requireLiveAdmin(session.user.id);
  if (!guard.authorized) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  if (!blog.isTrashed) {
    return NextResponse.json(
      { error: "Blog must be moved to trash before permanent deletion" },
      { status: 400 }
    );
  }

  await prisma.blog.delete({ where: { id } });

  revalidateFrontendPath("/blogs");
  if (blog.slug) {
    revalidateFrontendPath(`/blogs/${blog.slug}`);
  }

  return NextResponse.json({ success: true });
}
