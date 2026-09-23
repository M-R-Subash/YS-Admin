import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma, { mapDbToPageData } from "@/lib/prisma";

// GET /api/pages — list all pages
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");

  let whereClause: any = {};
  if (statusParam === "trash") {
    whereClause = { isTrashed: true };
  } else if (statusParam === "published" || statusParam === "PUBLISHED") {
    whereClause = { isTrashed: false, status: "published" };
  } else if (statusParam === "draft" || statusParam === "DRAFT") {
    whereClause = { isTrashed: false, status: "draft" };
  } else if (statusParam === "active") {
    whereClause = { isTrashed: false };
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
      author: {
        select: { name: true }
      }
    },
    orderBy: { updatedAt: "desc" },
  });
  
  const mappedPages = pages.map(mapDbToPageData);
  return NextResponse.json(mappedPages);
}
