import type { NextFunction, Request, Response } from 'express';

// NOTE: This is a simplified rate limiter for demonstration purposes.
// For production use, consider using the Redis-based rate limiter which provides:
// 1. Persistent storage: Request counts are stored in Redis and survive restarts.
// 2. Efficient cleanup: Uses Redis TTL for automatic cleanup of stale entries.
// 3. Better performance: Atomic operations via Lua scripts.
// Import `createRedisRateLimiter` from `@cortex-os/a2a-common` for production use.

interface RequestRecord {
	count: number;
	startTime: number;
}

export interface RateLimiterOptions {
	limit?: number;
	windowMs?: number;
}

export function createRateLimiter({
	limit = 5,
	windowMs = 60_000,
}: RateLimiterOptions = {}) {
	const requestMap = new Map<string, RequestRecord>();

	return function rateLimiter(req: Request, res: Response, next: NextFunction) {
		const xff = req.headers['x-forwarded-for'];
		const forwarded = Array.isArray(xff) ? xff[0] : xff;
		const ip: string = (forwarded ?? req.ip ?? '').toString();
		const currentTime = Date.now();

		// cleanup stale entries
		for (const [key, record] of requestMap) {
			if (currentTime - record.startTime >= windowMs) {
				requestMap.delete(key);
			}
		}

		const record = requestMap.get(ip);

		if (!record || currentTime - record.startTime >= windowMs) {
			requestMap.set(ip, { count: 1, startTime: currentTime });
			return next();
		}

		record.count += 1;
		if (record.count > limit) {
			const retryAfter = Math.ceil(
				(record.startTime + windowMs - currentTime) / 1000,
			);
			res.setHeader('Retry-After', retryAfter);
			res.status(429).send('Too Many Requests');
		} else {
			next();
		}
	};
}

export const rateLimiter = createRateLimiter();
