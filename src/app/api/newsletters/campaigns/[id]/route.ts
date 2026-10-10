import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { executeCampaignDispatch } from "@/lib/newsletter/batch-engine";

export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const campaign = await prisma.newsletterCampaign.findUnique({
      where: { id },
      include: {
        blog: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error: any) {
    console.error("[API:Newsletters:Campaigns:GET-ID] Error:", error);
    return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const campaign = await prisma.newsletterCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, scheduledAt } = body;

    if (action === "cancel") {
      if (campaign.status !== "scheduled") {
        return NextResponse.json(
          { error: "Only scheduled campaigns can be cancelled." },
          { status: 400 }
        );
      }

      const updated = await prisma.newsletterCampaign.update({
        where: { id },
        data: {
          status: "draft",
          scheduledAt: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Campaign schedule cancelled.",
        campaign: updated,
      });
    }

    if (action === "reschedule") {
      if (campaign.status !== "scheduled" && campaign.status !== "draft") {
        return NextResponse.json(
          { error: `Cannot reschedule campaign with status "${campaign.status}".` },
          { status: 400 }
        );
      }

      if (!scheduledAt) {
        return NextResponse.json(
          { error: "Scheduled date and time is required." },
          { status: 400 }
        );
      }

      const parsedDate = new Date(scheduledAt);
      if (isNaN(parsedDate.getTime()) || parsedDate.getTime() <= Date.now()) {
        return NextResponse.json(
          { error: "Scheduled date must be in the future." },
          { status: 400 }
        );
      }

      const updated = await prisma.newsletterCampaign.update({
        where: { id },
        data: {
          status: "scheduled",
          scheduledAt: parsedDate,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Campaign rescheduled for ${parsedDate.toLocaleString()}.`,
        campaign: updated,
      });
    }

    if (action === "send-now") {
      if (campaign.status === "processing") {
        return NextResponse.json(
          { error: "Campaign is already being dispatched." },
          { status: 400 }
        );
      }

      if (campaign.status === "completed") {
        return NextResponse.json(
          { error: "Campaign has already completed dispatch." },
          { status: 400 }
        );
      }

      const activeSubscribersCount = await prisma.subscriber.count({
        where: { status: "active" },
      });

      if (activeSubscribersCount === 0) {
        return NextResponse.json(
          { error: "No active subscribers found to receive this campaign." },
          { status: 400 }
        );
      }

      const updated = await prisma.newsletterCampaign.update({
        where: { id },
        data: {
          status: "processing",
          scheduledAt: null,
          totalRecipients: activeSubscribersCount,
        },
      });

      // Dispatch asynchronously
      executeCampaignDispatch(updated.id).catch((err) => {
        console.error(`[Campaign:${updated.id}] Dispatch failed:`, err);
      });

      return NextResponse.json({
        success: true,
        message: `Campaign dispatch initiated for ${activeSubscribersCount} active subscribers.`,
        campaign: updated,
      });
    }

    return NextResponse.json({ error: "Invalid action specified." }, { status: 400 });
  } catch (error: any) {
    console.error("[API:Newsletters:Campaigns:PATCH-ID] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update campaign" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const campaign = await prisma.newsletterCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status === "processing") {
      return NextResponse.json(
        { error: "Cannot delete a campaign that is actively sending." },
        { status: 400 }
      );
    }

    await prisma.newsletterCampaign.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Campaign deleted successfully.",
    });
  } catch (error: any) {
    console.error("[API:Newsletters:Campaigns:DELETE-ID] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
