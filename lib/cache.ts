// High-Performance Caching Layer with Redis & In-Memory Fallbacks

const memoryCache = new Map<string, { value: any; expiresAt: number }>();

/**
 * Helper to call Upstash Redis REST endpoints without external dependencies.
 * Perfect for Vercel Serverless/Edge functions.
 */
async function redisRestCommand(command: string[]): Promise<any> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  try {
    // Upstash REST commands are sent as JSON arrays to avoid URL-encoding limits
    const res = await fetch(`${url.replace(/\/$/, "")}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(command),
      // Prevent Next.js from caching the Redis API response itself
      cache: "no-store"
    });

    if (!res.ok) {
      console.warn(`[Redis Cache Warn] Command failed: ${command[0]} with status ${res.status}`);
      return null;
    }

    const data = (await res.json()) as { result?: any; error?: string };
    if (data.error) {
      console.error("[Redis Cache Command Error]", data.error);
      return null;
    }
    return data.result;
  } catch (err) {
    console.error("[Redis Cache Connection Exception]", err);
    return null;
  }
}

/**
 * Checks if Upstash Redis credentials are fully configured.
 */
export function isRedisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Retrieves a value from the cache, falling back to database fetch on miss.
 * Uses Upstash Redis REST if configured, otherwise falls back to a fast in-memory map.
 */
export async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds = 60
): Promise<T> {
  const now = Date.now();

  // 1. Try Redis Cache
  if (isRedisConfigured()) {
    try {
      const cachedString = await redisRestCommand(["GET", key]);
      if (cachedString && typeof cachedString === "string") {
        console.log(`[Cache HIT - Redis] Key: ${key}`);
        return JSON.parse(cachedString) as T;
      }
    } catch (err) {
      console.error("[Redis Cache Retrieve Fail]", err);
    }
  }

  // 2. Try In-Memory Fallback Cache
  const memoryCached = memoryCache.get(key);
  if (memoryCached && now < memoryCached.expiresAt) {
    console.log(`[Cache HIT - In-Memory] Key: ${key}`);
    return memoryCached.value as T;
  }

  // 3. Cache Miss - Fetch fresh data from DB
  const source = isRedisConfigured() ? "Redis" : "In-Memory";
  console.log(`[Cache MISS - ${source}] Key: ${key}`);
  const freshValue = await fetchFn();

  // Save to Redis if configured
  if (isRedisConfigured()) {
    try {
      await redisRestCommand(["SET", key, JSON.stringify(freshValue), "EX", ttlSeconds.toString()]);
    } catch (err) {
      console.error("[Redis Cache Save Fail]", err);
    }
  }

  // Save to In-Memory fallback (always save as local hot cache)
  memoryCache.set(key, {
    value: freshValue,
    expiresAt: now + ttlSeconds * 1000
  });

  return freshValue;
}

/**
 * Invalidates a specific cache key.
 */
export async function invalidateCacheKey(key: string): Promise<void> {
  // Clear local memory
  memoryCache.delete(key);

  // Clear Redis if active
  if (isRedisConfigured()) {
    try {
      await redisRestCommand(["DEL", key]);
      console.log(`[Cache INVALIDATE - Redis] Key: ${key}`);
    } catch (err) {
      console.error("[Redis Cache Invalidate Fail]", err);
    }
  }
}

/**
 * Clears all cache entries starting with a specific prefix.
 */
export async function invalidateCachePrefix(prefix: string): Promise<void> {
  // Clear local memory keys
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }

  // Clear Redis prefix if active
  if (isRedisConfigured()) {
    try {
      const keys = await redisRestCommand(["KEYS", `${prefix}*`]);
      if (Array.isArray(keys) && keys.length > 0) {
        await redisRestCommand(["DEL", ...keys]);
        console.log(`[Cache INVALIDATE PREFIX - Redis] Prefix: ${prefix} (${keys.length} keys)`);
      }
    } catch (err) {
      console.error("[Redis Cache Prefix Invalidate Fail]", err);
    }
  }
}
