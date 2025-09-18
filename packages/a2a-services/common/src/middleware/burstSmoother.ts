import type { NextFunction, Request, Response } from 'express';

export interface BurstSmootherOptions {
	ratePerSec: number; // tokens added per second
	burst: number; // bucket capacity
	keyHeader?: string; // header used to create separate buckets
	now?: () => number; // injectable clock (ms)
}

interface Bucket {
	tokens: number;
	last: number;
}

export interface BurstSmootherMetrics {
	rejected: number;
	accepted: number;
	buckets: number;
}

export interface BurstSmootherMiddleware {
	(req: Request, res: Response, next: NextFunction): void;
	metrics(): BurstSmootherMetrics;
}

export function createBurstSmoother({
	ratePerSec,
	burst,
	keyHeader,
	now = () => Date.now(),
}: BurstSmootherOptions): BurstSmootherMiddleware {
	if (ratePerSec <= 0) throw new Error('ratePerSec must be > 0');
	if (burst <= 0) throw new Error('burst must be > 0');
	const buckets = new Map<string, Bucket>();
	const metrics: BurstSmootherMetrics = {
		rejected: 0,
		accepted: 0,
		buckets: 0,
	};

	function refill(b: Bucket, current: number) {
		const elapsedMs = current - b.last;
		if (elapsedMs > 0) {
			const add = (elapsedMs / 1000) * ratePerSec;
			b.tokens = Math.min(burst, b.tokens + add);
			b.last = current;
		}
	}

	function acquire(key: string): boolean {
		const current = now();
		let bucket = buckets.get(key);
		if (!bucket) {
			bucket = { tokens: burst, last: current }; // starts full enabling immediate burst
			buckets.set(key, bucket);
			metrics.buckets = buckets.size;
		}
		refill(bucket, current);
		if (bucket.tokens >= 1) {
			bucket.tokens -= 1;
			metrics.accepted += 1;
			return true;
		}
		metrics.rejected += 1;
		return false;
	}

	const middleware = ((req: Request, res: Response, next: NextFunction) => {
		const key = keyHeader ? String(req.headers[keyHeader.toLowerCase()] || 'global') : 'global';
		if (acquire(key)) return next();
		res.status(429).json({ error: 'Rate smoothed: insufficient tokens' });
	}) as BurstSmootherMiddleware;
	middleware.metrics = () => ({ ...metrics });
	return middleware;
}
