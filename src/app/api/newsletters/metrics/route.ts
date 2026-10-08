import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [totalSubscribers, activeSubscribers, unsubscribedSubscribers, totalCampaigns, campaigns] =
      await Promise.all([
        prisma.subscriber.count(),
        prisma.subscriber.count({ where: { status: "active" } }),
        prisma.subscriber.count({ where: { status: "unsubscribed" } }),
        prisma.newsletterCampaign.count(),
        prisma.newsletterCampaign.findMany({
          select: {
            totalRecipients: true,
            successCount: true,
            failedCount: true,
            status: true,
          },
        }),
      ]);

    const totalEmailsSent = campaigns.reduce((acc, c) => acc + c.successCount, 0);
    const totalAttempted = campaigns.reduce((acc, c) => acc + c.successCount + c.failedCount, 0);
    const avgDeliveryRate = totalAttempted > 0 ? Math.round((totalEmailsSent / totalAttempted) * 100) : 100;

    return NextResponse.json({
      metrics: {
        totalSubscribers,
        activeSubscribers,
        unsubscribedSubscribers,
        totalCampaigns,
        totalEmailsSent,
        avgDeliveryRate,
      },
    });
  } catch (error) {
    console.error("[API:Newsletters:Metrics] Error:", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}
