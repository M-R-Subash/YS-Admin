import { Redis } from "@upstash/redis";

let redisInstance: Redis | null = null;

/**
 * Returns a singleton instance of the Upstash Redis client.
 * Returns null if credentials are not configured, allowing seamless fallback.
 */
export function getRedisClient(): Redis | null {
  if (redisInstance) {
    return redisInstance;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  try {
    redisInstance = new Redis({
      url,
      token,
    });
    return redisInstance;
  } catch (error) {
    console.error("[Redis] Initialization failed, running in memory-fallback mode:", error);
    return null;
  }
}

/**
 * Shared singleton export
 */
export const redis = getRedisClient();
