import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma, { mapDbToPageData } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const isUserAdmin = session.user.role === "ADMIN";

    const [
      publishedPagesCount,
      totalBlogsCount,
      totalCommentsCount,
      unapprovedCommentsCount,
      totalSubmissionsCount,
      unreadSubmissionsCount,
      recentPagesRaw,
    ] = await Promise.all([
      prisma.page.count({
        where: { isTrashed: false, status: "published" },
      }),
      prisma.blog.count({
        where: { isTrashed: false },
      }),
      isUserAdmin
        ? prisma.comment.count({
            where: { isTrashed: false, parentId: null },
          })
        : Promise.resolve(0),
      isUserAdmin
        ? prisma.comment.count({
            where: { isTrashed: false, isApproved: false },
          })
        : Promise.resolve(0),
      isUserAdmin
        ? prisma.formSubmission.count({
            where: { isTrashed: false },
          })
        : Promise.resolve(0),
      isUserAdmin
        ? prisma.formSubmission.count({
            where: { isTrashed: false, isRead: false },
          })
        : Promise.resolve(0),
      prisma.page.findMany({
        where: { isTrashed: false },
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
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
    ]);

    const recentPages = recentPagesRaw.map(mapDbToPageData);

    return NextResponse.json({
      publishedPagesCount,
      totalBlogsCount,
      totalCommentsCount,
      unapprovedCommentsCount,
      totalSubmissionsCount,
      unreadSubmissionsCount,
      recentPages,
    });
  } catch (error: any) {
    console.error("Dashboard stats fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch dashboard stats", error: error.message },
      { status: 500 }
    );
  }
}
