import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { fetchWithMemoryCache } from "@/lib/server/memory-cache";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const isUserAdmin = session.user.role === "ADMIN";
    const cacheKey = `badges:${isUserAdmin ? "admin" : "editor"}`;

    const badgeData = await fetchWithMemoryCache(
      cacheKey,
      async () => {
        const [unreadSubmissions, pendingComments, upcomingScheduled] = await Promise.all([
          isUserAdmin
            ? prisma.formSubmission.count({
                where: { isTrashed: false, isRead: false },
              })
            : Promise.resolve(0),
          isUserAdmin
            ? prisma.comment.count({
                where: { isTrashed: false, isApproved: false },
              })
            : Promise.resolve(0),
          Promise.all([
            prisma.blog.count({
              where: { status: "scheduled", isTrashed: false },
            }),
            prisma.newsletterCampaign.count({
              where: { status: "scheduled" },
            }),
          ]).then(([blogs, campaigns]) => blogs + campaigns),
        ]);

        return {
          unreadSubmissions,
          pendingComments,
          upcomingScheduled,
        };
      },
      15000 // 15 second memory cache window
    );

    return NextResponse.json(badgeData);
  } catch (error: any) {
    console.error("Badges count fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch badge counts", error: error.message },
      { status: 500 }
    );
  }
}
