import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
  const { id } = await params;
  const body = await request.json();
  let { title, slug, content, status, isTrashed, featuredImage, allowComments, tags, categories, excerpt, metaTitle, metaDesc, focusKeyword } = body;

  if (isTrashed === true) {
    status = "draft";
  }
  
  if (status === "published") {
    body.publishedAt = new Date().toISOString();
  } else if (status === "draft") {
    body.publishedAt = null; // optional: unset if moving to draft
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

  const blog = await prisma.blog.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(slug !== undefined && { slug }),
      ...(status !== undefined && { status }),
      ...(content !== undefined && { content }),
      ...(isTrashed !== undefined && { isTrashed }),
      ...(featuredImage !== undefined && { featuredImage }),
      ...(allowComments !== undefined && { allowComments }),
      ...(tags !== undefined && { tags }),
      ...(categories !== undefined && { categories }),
      ...(excerpt !== undefined && { excerpt }),
      ...(seoData && { seo: seoData }),
      ...(body.publishedAt !== undefined && { publishedAt: body.publishedAt }),
    },
    include: { seo: true }
  });

  return NextResponse.json(blog);
}

// DELETE /api/blogs/[id] — delete a blog
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const blog = await prisma.blog.findUnique({ where: { id } });
  if (!blog || !blog.isTrashed) {
    return NextResponse.json(
      { error: "Blog must be moved to trash before permanent deletion" },
      { status: 400 }
    );
  }

  await prisma.blog.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
