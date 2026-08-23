import { NextResponse } from "next/server";
import prisma, { mapDbToPageData } from "@/lib/prisma";

// GET /api/pages — list all pages
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");

  let whereClause: any = { isTrashed: false };
  if (statusParam === "trash") {
    whereClause = { isTrashed: true };
  } else if (statusParam === "published" || statusParam === "PUBLISHED") {
    whereClause = { isTrashed: false, status: "published" };
  } else if (statusParam === "draft" || statusParam === "DRAFT") {
    whereClause = { isTrashed: false, status: "draft" };
  }

  const pages = await prisma.page.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      isTrashed: true,
      createdAt: true,
      updatedAt: true,
      seo: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  
  const mappedPages = pages.map(mapDbToPageData);
  return NextResponse.json(mappedPages);
}
