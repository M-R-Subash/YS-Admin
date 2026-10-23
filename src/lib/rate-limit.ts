import { getRedisClient } from "./redis";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

// In-memory fallback tracker
const memoryStore = new Map<string, Map<string, RateLimitRecord>>();

// Periodic cleanup every 5 minutes for in-memory fallback
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    memoryStore.forEach((store) => {
      store.forEach((record, key) => {
        if (record.resetTime < now) {
          store.delete(key);
        }
      });
    });
  }, 5 * 60 * 1000);
}

function memoryRateLimit(
  namespace: string,
  identifier: string,
  options: { windowMs: number; max: number }
): RateLimitResult {
  if (!memoryStore.has(namespace)) {
    memoryStore.set(namespace, new Map<string, RateLimitRecord>());
  }

  const store = memoryStore.get(namespace)!;
  const now = Date.now();
  const record = store.get(identifier);

  if (!record || record.resetTime < now) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + options.windowMs,
    };
    store.set(identifier, newRecord);
    return {
      success: true,
      limit: options.max,
      remaining: options.max - 1,
      resetTime: newRecord.resetTime,
    };
  }

  if (record.count >= options.max) {
    return {
      success: false,
      limit: options.max,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.count += 1;
  return {
    success: true,
    limit: options.max,
    remaining: options.max - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Distributed rate limiter powered by Upstash Redis with automatic in-memory fallback.
 */
export async function rateLimit(
  namespace: string,
  identifier: string,
  options: { windowMs: number; max: number }
): Promise<RateLimitResult> {
  const redis = getRedisClient();

  if (!redis) {
    return memoryRateLimit(namespace, identifier, options);
  }

  try {
    const key = `ratelimit:${namespace}:${identifier}`;
    const windowSec = Math.max(1, Math.ceil(options.windowMs / 1000));

    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.ttl(key);
    const [count, ttl] = (await pipeline.exec()) as [number, number];

    // If this is the very first hit in the window, set the expiration timer
    if (count === 1) {
      redis.expire(key, windowSec).catch((err) => {
        console.warn("[RateLimit:Redis] Failed to set expire:", err);
      });
    }

    const remainingTtlSec = ttl > 0 ? ttl : windowSec;
    const resetTime = Date.now() + remainingTtlSec * 1000;

    if (count > options.max) {
      return {
        success: false,
        limit: options.max,
        remaining: 0,
        resetTime,
      };
    }

    return {
      success: true,
      limit: options.max,
      remaining: Math.max(0, options.max - count),
      resetTime,
    };
  } catch (error) {
    console.error("[RateLimit:Redis] Redis error, falling back to in-memory:", error);
    return memoryRateLimit(namespace, identifier, options);
  }
}

export function getClientIp(headers: Headers): string {
  // 1. Prioritize edge/CDN headers that cannot be spoofed by client
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  // 2. Nginx/Proxy direct real IP
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // 3. Fallback to x-forwarded-for with IPv4/IPv6 validation
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) {
      const candidate = parts[0];
      if (/^[0-9a-fA-F:.]+$/.test(candidate)) {
        return candidate;
      }
    }
  }

  return "127.0.0.1";
}
