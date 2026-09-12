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

  return NextResponse.json({
    ...mapDbToPageData(page),
    previewSecret: process.env.PREVIEW_SECRET || "",
  });
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
  const { title, slug, content, isTrashed, action } = body;
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
  });

  // Revalidate frontend path asynchronously if live content was updated
  if (shouldRevalidate && page.slug) {
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
  
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Only administrators can permanently delete website pages" },
      { status: 403 }
    );
  }

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
