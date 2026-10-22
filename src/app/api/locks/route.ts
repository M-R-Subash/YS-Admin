import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRedisClient } from "@/lib/redis";
import { acquireResourceLock, releaseResourceLock } from "@/lib/server/locks";

export const dynamic = "force-dynamic";

/**
 * GET /api/locks?type=blog
 * Returns all currently active resource locks for that type.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") || "blog") as "blog" | "page";

    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json({ locks: {} });
    }

    const pattern = `lock:${type}:*`;
    const keys = await redis.keys(pattern);

    if (!keys || keys.length === 0) {
      return NextResponse.json({ locks: {} });
    }

    const values = await redis.mget<Array<{ userId: string; userName: string }>>(...keys);
    const locks: Record<string, { userId: string; userName: string }> = {};

    keys.forEach((key, index) => {
      const resourceId = key.replace(`lock:${type}:`, "");
      const val = values[index];
      if (val && typeof val === "object" && val.userId) {
        locks[resourceId] = val;
      }
    });

    return NextResponse.json({ locks });
  } catch (err: any) {
    console.error("[Locks:GET] Failed to list active locks:", err);
    return NextResponse.json({ locks: {} });
  }
}

/**
 * POST /api/locks
 * Acquire or heartbeat a lock for the current authenticated user.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { resourceType = "blog", resourceId } = body;

    if (!resourceId || typeof resourceId !== "string") {
      return NextResponse.json({ error: "resourceId is required" }, { status: 400 });
    }

    const userName = session.user.name || session.user.email || "Another editor";
    const result = await acquireResourceLock(
      resourceType as "blog" | "page",
      resourceId,
      session.user.id,
      userName,
      90 // 90 seconds TTL with 30s client heartbeats
    );

    return NextResponse.json({
      success: true,
      acquired: result.acquired,
      lockedBy: result.lockedBy,
      expiresInSec: result.expiresInSec,
    });
  } catch (err: any) {
    console.error("[Locks:POST] Failed to acquire lock:", err);
    return NextResponse.json({ success: false, acquired: true }); // Fail open
  }
}

/**
 * DELETE /api/locks
 * Explicitly release the resource lock upon save, exit, or tab close.
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let resourceType: "blog" | "page" = "blog";
    let resourceId = "";

    // Support both JSON body and search params (for navigator.sendBeacon or unload fetch)
    const { searchParams } = new URL(request.url);
    if (searchParams.get("id")) {
      resourceId = searchParams.get("id") || "";
      resourceType = (searchParams.get("type") as "blog" | "page") || "blog";
    } else {
      const body = await request.json().catch(() => ({}));
      resourceId = body.resourceId || "";
      resourceType = body.resourceType || "blog";
    }

    if (!resourceId) {
      return NextResponse.json({ error: "resourceId is required" }, { status: 400 });
    }

    const released = await releaseResourceLock(resourceType, resourceId, session.user.id);
    return NextResponse.json({ success: true, released });
  } catch (err: any) {
    console.error("[Locks:DELETE] Failed to release lock:", err);
    return NextResponse.json({ success: true, released: false });
  }
}
