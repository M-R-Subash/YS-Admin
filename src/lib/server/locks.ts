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
 * Release an editing lock securely using an atomic Lua script to prevent race conditions.
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
    // Atomic Compare-and-Delete using Lua:
    // Decodes the lock JSON, checks if userId matches, and deletes all in a single atomic transaction.
    const script = `
      local current = redis.call("GET", KEYS[1])
      if current then
        local decoded = cjson.decode(current)
        if decoded and decoded.userId == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        end
      end
      return 0
    `;

    const result = await redis.eval(script, [key], [userId]);
    return result === 1;
  } catch (err) {
    console.error("[Locks:Redis] Error releasing lock:", err);
    return false;
  }
}
