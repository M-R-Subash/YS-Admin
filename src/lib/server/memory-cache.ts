/**
 * High-Performance Server-Side Cache for High-Frequency Read APIs
 * 
 * Powered by Upstash Redis (Distributed Cloud Cache) with automatic
 * local in-memory fallback.
 * Absorbs repeated hits for dashboard stats, badges, and aggregations.
 */

import { getRedisClient } from "../redis";

interface LocalCacheEntry<T> {
  data: T;
  expiresAt: number;
}

const localStore = new Map<string, LocalCacheEntry<any>>();

/**
 * Retrieve cached item from local memory store
 */
export function getLocalMemoryCache<T>(key: string): T | null {
  const entry = localStore.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    localStore.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Store item in local memory store
 */
export function setLocalMemoryCache<T>(key: string, data: T, ttlMs = 15000): void {
  localStore.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Legacy alias for backwards compatibility
 */
export const getMemoryCache = getLocalMemoryCache;
export const setMemoryCache = setLocalMemoryCache;

/**
 * Invalidate cache entries matching a key or prefix across both Redis and local memory.
 */
export async function invalidateMemoryCache(prefixOrKey: string): Promise<void> {
  // 1. Immediately wipe matching local memory keys
  for (const key of localStore.keys()) {
    if (key === prefixOrKey || key.startsWith(prefixOrKey)) {
      localStore.delete(key);
    }
  }

  // 2. Wipe from Redis safely using non-blocking SCAN
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const pattern = prefixOrKey.endsWith("*") ? prefixOrKey : `${prefixOrKey}*`;
    let cursor = 0;
    const keysToDelete: string[] = [];

    // Iteratively scan keys without blocking the Redis single-threaded runtime
    do {
      const [nextCursor, matchedKeys] = await redis.scan(cursor, {
        match: pattern,
        count: 100,
      });
      cursor = typeof nextCursor === "string" ? parseInt(nextCursor, 10) : nextCursor;
      if (Array.isArray(matchedKeys) && matchedKeys.length > 0) {
        keysToDelete.push(...matchedKeys);
      }
    } while (cursor !== 0 && keysToDelete.length < 1000);

    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
    }
    // Also delete exact key if not wildcard
    if (!prefixOrKey.includes("*")) {
      await redis.del(prefixOrKey);
    }
  } catch (error) {
    console.error(`[Cache:Redis] Failed to invalidate prefix "${prefixOrKey}":`, error);
  }
}

/**
 * Invalidate all high-frequency aggregate/counter caches
 */
export async function invalidateAggregateCaches(): Promise<void> {
  await Promise.allSettled([
    invalidateMemoryCache("badges:"),
    invalidateMemoryCache("dashboard-stats:"),
  ]);
}

/**
 * Helper to fetch with distributed Redis cache (with fallback to local memory)
 */
export async function fetchWithMemoryCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 15000
): Promise<T> {
  const redis = getRedisClient();

  // 1. Try Redis Distributed Cache
  if (redis) {
    try {
      const cached = await redis.get<T>(key);
      if (cached !== null && cached !== undefined) {
        // Keep local memory warm for lightning-fast sub-millisecond local reads
        setLocalMemoryCache(key, cached, ttlMs);
        return cached;
      }
    } catch (err) {
      console.warn(`[Cache:Redis] Read failed for key "${key}", falling back:`, err);
    }
  }

  // 2. Try local memory cache
  const localCached = getLocalMemoryCache<T>(key);
  if (localCached !== null) {
    return localCached;
  }

  // 3. Cache Miss: Execute fresh query
  const fresh = await fetcher();

  // 4. Update local memory
  setLocalMemoryCache(key, fresh, ttlMs);

  // 5. Update Redis (non-blocking)
  if (redis) {
    redis.set(key, fresh, { px: ttlMs }).catch((err) => {
      console.warn(`[Cache:Redis] Write failed for key "${key}":`, err);
    });
  }

  return fresh;
}
