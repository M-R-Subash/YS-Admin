import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireLiveUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guard = await requireLiveUser(session.user?.id);
    if (!guard.authorized) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "blogs" | "pages" | "subscribers"
    const idsParam = searchParams.get("ids");
    const targetIds = idsParam
      ? idsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : null;

    if (!type || !["blogs", "pages", "subscribers"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Allowed: blogs, pages, subscribers" },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString().slice(0, 10);

    if (type === "blogs") {
      const where: any = targetIds && targetIds.length > 0 ? { id: { in: targetIds } } : {};
      const blogs = await prisma.blog.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          isTrashed: true,
          excerpt: true,
          content: true,
          draftContent: true,
          featuredImage: true,
          readingTime: true,
          allowComments: true,
          categories: true,
          tags: true,
          publishedAt: true,
          scheduledAt: true,
          createdAt: true,
          updatedAt: true,
          seo: {
            select: {
              metaTitle: true,
              metaDesc: true,
              focusKeyword: true,
              ogImage: true,
              ogTitle: true,
              ogDesc: true,
              canonicalUrl: true,
              structuredData: true,
              noIndex: true,
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const payload = {
        exportedAt: new Date().toISOString(),
        entityType: "blogs",
        totalItems: blogs.length,
        items: blogs,
      };

      const filename = `blogs-export-${timestamp}.json`;
      return new NextResponse(JSON.stringify(payload, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (type === "pages") {
      const where: any = targetIds && targetIds.length > 0 ? { id: { in: targetIds } } : {};
      const pages = await prisma.page.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          isTrashed: true,
          content: true,
          draftContent: true,
          createdAt: true,
          updatedAt: true,
          seo: {
            select: {
              metaTitle: true,
              metaDesc: true,
              focusKeyword: true,
              ogImage: true,
              ogTitle: true,
              ogDesc: true,
              canonicalUrl: true,
              structuredData: true,
              noIndex: true,
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const payload = {
        exportedAt: new Date().toISOString(),
        entityType: "pages",
        totalItems: pages.length,
        items: pages,
      };

      const filename = `webpages-export-${timestamp}.json`;
      return new NextResponse(JSON.stringify(payload, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (type === "subscribers") {
      const where: any = targetIds && targetIds.length > 0 ? { id: { in: targetIds } } : {};
      const subscribers = await prisma.subscriber.findMany({
        where,
        select: {
          id: true,
          email: true,
          status: true,
          source: true,
          resubscribeCount: true,
          resubscribedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const payload = {
        exportedAt: new Date().toISOString(),
        entityType: "subscribers",
        totalItems: subscribers.length,
        items: subscribers,
      };

      const filename = `subscribers-export-${timestamp}.json`;
      return new NextResponse(JSON.stringify(payload, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid type requested" }, { status: 400 });
  } catch (error: any) {
    console.error("[API:Export] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate export file" },
      { status: 500 }
    );
  }
}
