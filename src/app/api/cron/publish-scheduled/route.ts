import { NextResponse } from "next/server";
import {
  verifyCronAuthorization,
  publishOverdueBlogs,
} from "@/lib/services/blog-scheduler";

/**
 * Universal Cron Endpoint for Scheduled Blog Publishing
 *
 * Can be called by:
 * 1. cron-job.org / external cron services (GET or POST)
 * 2. Linux VPS / Hostinger crontab (curl)
 * 3. Any standard HTTP client
 *
 * Authentication:
 * - Header: Authorization: Bearer <CRON_SECRET> (or raw <CRON_SECRET>)
 * - Query param: ?secret=<CRON_SECRET>
 */

async function handleScheduledPublish(req: Request) {
  try {
    // 1. Verify credentials
    const authCheck = verifyCronAuthorization(req);
    if (!authCheck.isAuthorized) {
      return NextResponse.json(
        { error: authCheck.reason || "Unauthorized. Invalid or missing secret." },
        { status: 401 }
      );
    }

    // 2. Execute publishing using reusable scheduler service
    const result = await publishOverdueBlogs();

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    console.error("[CRON] Unexpected execution failure:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error occurred during scheduled publish.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return handleScheduledPublish(req);
}

export async function POST(req: Request) {
  return handleScheduledPublish(req);
}
