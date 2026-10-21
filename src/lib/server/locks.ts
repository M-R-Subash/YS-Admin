import { getRedisClient } from "@/lib/redis";

export interface LockResult {
  acquired: boolean;
  lockedBy?: string;
  expiresInSec?: number;
}

/**
 * Acquire or heartbeat an editing lock on a CMS resource (e.g. blog or page).
 * Prevents team members from accidentally overwriting each other's live drafts.
 */
export async function acquireResourceLock(
  resourceType: "blog" | "page",
  resourceId: string,
  userId: string,
  userName: string,
  ttlSec = 300
): Promise<LockResult> {
  const redis = getRedisClient();
  if (!redis) {
    // If Redis is not available, fail open so users aren't blocked
    return { acquired: true };
  }

  const key = `lock:${resourceType}:${resourceId}`;
  const lockData = { userId, userName };

  try {
    // Try to acquire lock with NX (only if not exists)
    const setSuccess = await redis.set(key, lockData, { nx: true, ex: ttlSec });

    if (setSuccess === "OK") {
      return { acquired: true };
    }

    // Lock already exists: check who holds it
    const currentHolder = await redis.get<{ userId: string; userName: string }>(key);
    const ttl = await redis.ttl(key);

    if (currentHolder?.userId === userId) {
      // Re-extend lock for the current holder (heartbeat)
      await redis.expire(key, ttlSec);
      return { acquired: true };
    }

    return {
      acquired: false,
      lockedBy: currentHolder?.userName || "Another team member",
      expiresInSec: ttl > 0 ? ttl : ttlSec,
    };
  } catch (err) {
    console.error("[Locks:Redis] Error acquiring lock:", err);
    return { acquired: true };
  }
}

/**
 * Release an editing lock when a user saves or closes the editor.
 */
export async function releaseResourceLock(
  resourceType: "blog" | "page",
  resourceId: string,
  userId: string
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return true;

  const key = `lock:${resourceType}:${resourceId}`;

  try {
    const currentHolder = await redis.get<{ userId: string; userName: string }>(key);
    if (!currentHolder || currentHolder.userId === userId) {
      await redis.del(key);
      return true;
    }
    return false;
  } catch (err) {
    console.error("[Locks:Redis] Error releasing lock:", err);
    return false;
  }
}
