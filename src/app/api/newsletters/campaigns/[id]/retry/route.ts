import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { retryFailedCampaignDispatch } from "@/lib/newsletter/batch-engine";

export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing campaign id" }, { status: 400 });
    }

    const result = await retryFailedCampaignDispatch(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to retry campaign" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Retried sending to ${result.retriedCount} recipient(s).`,
      result,
    });
  } catch (error: any) {
    console.error("[API:Newsletters:Campaigns:Retry] Error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred while retrying the campaign." },
      { status: 500 }
    );
  }
}
