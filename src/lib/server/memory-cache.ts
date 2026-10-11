/**
 * In-memory Server-Side Cache for High-Frequency Read APIs
 * 
 * Provides short-lived (TTL) in-memory caching to absorb repeated serverless/route-handler
 * hits for slow-changing counters, taxonomies, and aggregations.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<any>>();

/**
 * Retrieve cached item if present and not expired
 */
export function getMemoryCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Store item in cache with a TTL in milliseconds (default: 15 seconds)
 */
export function setMemoryCache<T>(key: string, data: T, ttlMs = 15000): void {
  store.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Invalidate all cache entries matching a key or prefix
 */
export function invalidateMemoryCache(prefixOrKey: string): void {
  for (const key of store.keys()) {
    if (key === prefixOrKey || key.startsWith(prefixOrKey)) {
      store.delete(key);
    }
  }
}

/**
 * Invalidate all high-frequency aggregate/counter caches
 */
export function invalidateAggregateCaches(): void {
  invalidateMemoryCache("badges:");
  invalidateMemoryCache("dashboard-stats:");
}

/**
 * Helper to fetch with cache: returns cached value or executes fallback and caches result
 */
export async function fetchWithMemoryCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 15000
): Promise<T> {
  const cached = getMemoryCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  const fresh = await fetcher();
  setMemoryCache(key, fresh, ttlMs);
  return fresh;
}
