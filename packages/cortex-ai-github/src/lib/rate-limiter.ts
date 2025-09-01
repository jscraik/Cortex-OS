/**
 * Simple rate limiter with functional approach
 * Industrial-strength rate limiting under 40 lines
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

const requestStore = new Map<string, number[]>();

export const checkRateLimit = (
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60000
): RateLimitResult => {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get and filter old requests
  const userRequests = (requestStore.get(key) || [])
    .filter(timestamp => timestamp > windowStart);

  const remaining = Math.max(0, maxRequests - userRequests.length);
  const allowed = remaining > 0;

  if (allowed) {
    userRequests.push(now);
    requestStore.set(key, userRequests);
  }

  return {
    allowed,
    remaining,
    resetTime: windowStart + windowMs,
    retryAfter: allowed ? undefined : Math.ceil((windowStart + windowMs - now) / 1000),
  };
};

export const clearRateLimit = (key: string): void => {
  requestStore.delete(key);
};
