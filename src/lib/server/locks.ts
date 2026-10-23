import { getRedisClient } from "@/lib/redis";

export interface LockResult {
  acquired: boolean;
  lockedBy?: string;
  expiresInSec?: number;
}

export interface LockRecord {
  userId: string;
  userName: string;
  expiresAt: number;
}

/**
 * Acquire or heartbeat an editing lock on a CMS resource (e.g. blog or page).
 * Stored in an atomic Redis Hash (`locks:${resourceType}`) to eliminate blocking O(N) KEYS scans.
 */
export async function acquireResourceLock(
  resourceType: "blog" | "page",
  resourceId: string,
  userId: string,
  userName: string,
  ttlSec = 180
): Promise<LockResult> {
  const redis = getRedisClient();
  if (!redis) {
    // If Redis is not available, fail open so editors aren't blocked
    return { acquired: true };
  }

  const hashKey = `locks:${resourceType}`;
  const now = Date.now();
  const expiresAt = now + ttlSec * 1000;

  try {
    const current = await redis.hget<LockRecord>(hashKey, resourceId);

    // If lock does not exist, has expired, or is already held by this user -> acquire/heartbeat
    if (!current || current.expiresAt <= now || current.userId === userId) {
      await redis.hset(hashKey, {
        [resourceId]: {
          userId,
          userName,
          expiresAt,
        },
      });

      return { acquired: true, expiresInSec: ttlSec };
    }

    // Lock is actively held by someone else
    const remainingSec = Math.max(1, Math.round((current.expiresAt - now) / 1000));
    return {
      acquired: false,
      lockedBy: current.userName || "Another team member",
      expiresInSec: remainingSec,
    };
  } catch (err) {
    console.error("[Locks:Redis] Error acquiring lock:", err);
    return { acquired: true };
  }
}

/**
 * Release an editing lock securely from the Redis Hash.
 */
export async function releaseResourceLock(
  resourceType: "blog" | "page",
  resourceId: string,
  userId: string
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return true;

  const hashKey = `locks:${resourceType}`;

  try {
    const current = await redis.hget<LockRecord>(hashKey, resourceId);
    if (!current) return true;

    // Only the user who acquired the lock can release it
    if (current.userId === userId) {
      await redis.hdel(hashKey, resourceId);
      return true;
    }

    return false;
  } catch (err) {
    console.error("[Locks:Redis] Error releasing lock:", err);
    return false;
  }
}

/**
 * Get all active (unexpired) locks for a given resource type.
 * Runs in O(M) where M is the small count of active locks in the hash, never scanning the global keyspace.
 */
export async function getActiveResourceLocks(
  resourceType: "blog" | "page"
): Promise<Record<string, { userId: string; userName: string }>> {
  const redis = getRedisClient();
  if (!redis) return {};

  const hashKey = `locks:${resourceType}`;

  try {
    const all = await redis.hgetall<Record<string, LockRecord>>(hashKey);
    if (!all || typeof all !== "object") return {};

    const now = Date.now();
    const active: Record<string, { userId: string; userName: string }> = {};
    const expiredKeys: string[] = [];

    for (const [id, record] of Object.entries(all)) {
      if (record && typeof record === "object" && record.expiresAt > now) {
        active[id] = {
          userId: record.userId,
          userName: record.userName,
        };
      } else {
        expiredKeys.push(id);
      }
    }

    // Lazy cleanup of expired locks in the hash
    if (expiredKeys.length > 0) {
      redis.hdel(hashKey, ...expiredKeys).catch(() => {});
    }

    return active;
  } catch (err) {
    console.error("[Locks:Redis] Error retrieving active locks:", err);
    return {};
  }
}
