import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveAdmin } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidateFrontendPath } from "@/lib/revalidate";
import { blogDraftSchema, blogPublishSchema } from "@/lib/schemas/blog/blog-validation";

// GET /api/blogs/[id] — get a single blog
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const blog = await prisma.blog.findUnique({
    where: { id },
    include: { seo: true },
  });

  if (!blog) {
    return NextResponse.json({ error: "Blog not found" }, { status: 404 });
  }

  return NextResponse.json(blog);
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
  const { title, slug, content, isTrashed, featuredImage, allowComments, tags, categories, excerpt, metaTitle, metaDesc, focusKeyword, action } = body;
  let { status } = body;

  // Validate action payload with Zod
  if (action === "publish" || action === "save-draft") {
    const schema = action === "publish" ? blogPublishSchema : blogDraftSchema;
    const validation = schema.safeParse(body);
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
  
  if (status === "published") {
    body.publishedAt = new Date().toISOString();
  } else if (status === "draft") {
    body.publishedAt = null;
  }

  // Handle SEO data if any SEO field is provided
  const seoData = (metaTitle !== undefined || metaDesc !== undefined || focusKeyword !== undefined) 
    ? {
        upsert: {
          create: {
            metaTitle: metaTitle || "",
            metaDesc: metaDesc || "",
            focusKeyword: focusKeyword || "",
          },
          update: {
            ...(metaTitle !== undefined && { metaTitle }),
            ...(metaDesc !== undefined && { metaDesc }),
            ...(focusKeyword !== undefined && { focusKeyword }),
          }
        }
      }
    : undefined;

  let updateData: any = {
    ...(isTrashed !== undefined && { isTrashed }),
    ...(seoData && { seo: seoData }),
    ...(body.publishedAt !== undefined && { publishedAt: body.publishedAt }),
  };

  let shouldRevalidate = false;

  if (action === "save-draft") {
    // Only save to draftContent without altering live content
    updateData = {
      ...updateData,
      draftContent: body,
      status: existingBlog.status === "published" ? "published" : (status || "draft"),
    };
  } else if (action === "publish") {
    // Commit to live content, reset draftContent
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
    };
    shouldRevalidate = true;
  } else if (action === "discard-draft") {
    // Clear draftContent, live content remains intact
    updateData = {
      ...updateData,
      draftContent: null,
    };
  } else {
    // Standard update
    updateData = {
      ...updateData,
      ...(title !== undefined && { title }),
      ...(slug !== undefined && { slug }),
      ...(status !== undefined && { status }),
      ...(content !== undefined && { content }),
      ...(featuredImage !== undefined && { featuredImage }),
      ...(allowComments !== undefined && { allowComments }),
      ...(tags !== undefined && { tags }),
      ...(categories !== undefined && { categories }),
      ...(excerpt !== undefined && { excerpt }),
      ...(body.draftContent !== undefined && { draftContent: body.draftContent }),
    };
    if (content !== undefined || status === "published") {
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
