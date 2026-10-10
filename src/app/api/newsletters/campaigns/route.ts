import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { executeCampaignDispatch } from "@/lib/newsletter/batch-engine";

export const maxDuration = 60;

const createCampaignSchema = z.object({
  subject: z.string().trim().min(1, "Subject line is required").max(150),
  bodyHtml: z.string().trim().min(1, "Email body content is required"),
  scheduledAt: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      prisma.newsletterCampaign.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          blog: {
            select: { id: true, title: true, slug: true },
          },
        },
      }),
      prisma.newsletterCampaign.count(),
    ]);

    return NextResponse.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[API:Newsletters:Campaigns:GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = createCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Validation failed" }, { status: 400 });
    }

    const { subject, bodyHtml, scheduledAt } = parsed.data;

    // Check if there are active subscribers
    const activeSubscribersCount = await prisma.subscriber.count({
      where: { status: "active" },
    });

    if (activeSubscribersCount === 0) {
      return NextResponse.json(
        { error: "No active subscribers found to receive this campaign. Add subscribers first." },
        { status: 400 }
      );
    }

    const parsedScheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    const isScheduledForFuture =
      parsedScheduledAt &&
      !isNaN(parsedScheduledAt.getTime()) &&
      parsedScheduledAt.getTime() > Date.now();

    if (isScheduledForFuture) {
      const campaign = await prisma.newsletterCampaign.create({
        data: {
          subject,
          bodyHtml,
          type: "CUSTOM_BLAST",
          status: "scheduled",
          scheduledAt: parsedScheduledAt,
          totalRecipients: activeSubscribersCount,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Campaign scheduled for delivery on ${parsedScheduledAt.toLocaleString()}`,
        campaign,
      });
    }

    // Create the campaign record for immediate delivery
    const campaign = await prisma.newsletterCampaign.create({
      data: {
        subject,
        bodyHtml,
        type: "CUSTOM_BLAST",
        status: "processing",
        totalRecipients: activeSubscribersCount,
      },
    });

    // Dispatch asynchronously in background
    executeCampaignDispatch(campaign.id).catch((err) => {
      console.error(`[Campaign:${campaign.id}] Dispatch failed:`, err);
    });

    return NextResponse.json({
      success: true,
      message: `Campaign queued for ${activeSubscribersCount} active subscribers`,
      campaign,
    });
  } catch (error: any) {
    console.error("[API:Newsletters:Campaigns:POST] Error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create campaign" }, { status: 500 });
  }
}
