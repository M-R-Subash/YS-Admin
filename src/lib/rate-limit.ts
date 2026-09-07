interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const trackers = new Map<string, Map<string, RateLimitRecord>>();

// Periodic cleanup every 5 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    trackers.forEach((store) => {
      store.forEach((record, key) => {
        if (record.resetTime < now) {
          store.delete(key);
        }
      });
    });
  }, 5 * 60 * 1000);
}

export function rateLimit(
  namespace: string,
  identifier: string,
  options: { windowMs: number; max: number }
): { success: boolean; limit: number; remaining: number; resetTime: number } {
  if (!trackers.has(namespace)) {
    trackers.set(namespace, new Map<string, RateLimitRecord>());
  }

  const store = trackers.get(namespace)!;
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

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return headers.get("x-real-ip") || "127.0.0.1";
}
