import type { NextFunction, Request, Response } from 'express';

// NOTE: This is a simplified rate limiter for demonstration purposes.
// It is not suitable for production use due to the following limitations:
// 1. In-memory storage: The request counts are stored in memory and will be lost on restart.
//    A persistent store like Redis should be used for production.
// 2. Inefficient cleanup: The cleanup of stale entries is inefficient and can cause performance issues.
//    A store with TTL support would be a better choice.
// 3. Global state: The default `rateLimiter` instance shares state across all routes.
//    For more granular control, create a new instance using `createRateLimiter`.

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
