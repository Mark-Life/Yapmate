/**
 * Simple in-memory rate limiter
 * For single-instance servers only
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/** Clean expired entries periodically */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 60_000);

/**
 * Get client IP from request, handles Cloudflare proxy
 */
export const getClientIp = (req: Request) =>
  req.headers.get("cf-connecting-ip") ??
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
  req.headers.get("x-real-ip") ??
  "unknown";

/**
 * Check if key is rate limited
 * @param key - Unique identifier (e.g., IP address)
 * @param limit - Max requests allowed in window
 * @param windowMs - Time window in milliseconds
 * @returns true if rate limited, false if allowed
 */
export const isRateLimited = (key: string, limit: number, windowMs: number) => {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (entry.count >= limit) return true;

  entry.count++;
  return false;
};
