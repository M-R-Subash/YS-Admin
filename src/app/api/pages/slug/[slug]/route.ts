import { NextResponse } from "next/server";
import prisma, { mapDbToPageData } from "@/lib/prisma";

// GET /api/pages/slug/[slug] — get page by slug (for public site)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const page = await prisma.page.findUnique({
    where: { slug },
  });

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  return NextResponse.json(mapDbToPageData(page));
}
