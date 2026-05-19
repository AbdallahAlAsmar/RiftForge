// Lightweight, in-memory rate limiter for server environments

const trackers = new Map<string, { count: number; resetAt: number }>();

/**
 * Checks if the request under a given identifier exceeds a rate limit.
 * @param ip The unique identifier (e.g. client IP address)
 * @param limit Maximum number of requests allowed in the window
 * @param windowMs Time window size in milliseconds
 * @returns boolean true if the request is within limits, false if rate-limited
 */
export function rateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const tracker = trackers.get(ip);

  if (!tracker || now > tracker.resetAt) {
    trackers.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (tracker.count >= limit) {
    return false;
  }

  tracker.count += 1;
  return true;
}
