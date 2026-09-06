import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma, { mapDbToPageData } from "@/lib/prisma";
import { revalidateFrontendPath } from "@/lib/revalidate";

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
  });

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  return NextResponse.json(mapDbToPageData(page));
}

// PUT /api/pages/[id] — update a page
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  let { title, slug, content, status, isTrashed } = body;

  if (isTrashed === true) {
    status = "draft";
  }

  const page = await prisma.page.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(slug !== undefined && { slug }),
      ...(status !== undefined && { status }),
      ...(content !== undefined && { content }),
      ...(isTrashed !== undefined && { isTrashed }),
    },
  });

  // Revalidate frontend path asynchronously
  if (page.slug) {
    revalidateFrontendPath(page.slug);
  }

  return NextResponse.json(mapDbToPageData(page));
}

// DELETE /api/pages/[id] — delete a page
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page || !page.isTrashed) {
    return NextResponse.json(
      { error: "Page must be moved to trash before permanent deletion" },
      { status: 400 }
    );
  }

  await prisma.page.delete({ where: { id } });

  if (page.slug) {
    revalidateFrontendPath(page.slug);
  }

  return NextResponse.json({ success: true });
}
