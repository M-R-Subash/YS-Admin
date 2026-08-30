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
  let { title, slug, content, status, isTrashed, featuredImage, allowComments, tags, categories } = body;

  if (isTrashed === true) {
    status = "draft";
  }
  
  if (status === "published") {
    body.publishedAt = new Date().toISOString();
  } else if (status === "draft") {
    body.publishedAt = null; // optional: unset if moving to draft
  }

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
      ...(body.publishedAt !== undefined && { publishedAt: body.publishedAt }),
    },
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
