import type { Request } from 'express';
import Redis from 'ioredis';

export interface RateLimitStoreResult {
	allowed: boolean;
	retryAfterSec?: number;
}

export interface RateLimitStore {
	hit(key: string, nowMs: number, windowMs: number, max: number): Promise<RateLimitStoreResult>;
}

// In-memory store (for tests/local)
const memoryBuckets = new Map<string, number[]>();

async function memoryHit(
	key: string,
	nowMs: number,
	windowMs: number,
	max: number,
): Promise<RateLimitStoreResult> {
	const hits = memoryBuckets.get(key) ?? [];
	const fresh = hits.filter((t) => nowMs - t < windowMs);
	if (fresh.length >= max) {
		const retryAfterSec = Math.ceil((windowMs - (nowMs - fresh[0])) / 1000);
		memoryBuckets.set(key, fresh);
		return { allowed: false, retryAfterSec };
	}
	fresh.push(nowMs);
	memoryBuckets.set(key, fresh);
	return { allowed: true };
}

export function createMemoryStore(): RateLimitStore {
	return { hit: memoryHit };
}

// Redis store using sorted sets per key
export function createRedisStore(redis: Redis): RateLimitStore {
	const zKey = (k: string) => `rl:${k}`;
	return {
		async hit(key, nowMs, windowMs, max) {
			const rk = zKey(key);
			const min = nowMs - windowMs;
			// Remove old entries
			await redis.zremrangebyscore(rk, 0, min);
			// Add current hit with score = nowMs
			await redis.zadd(rk, nowMs, String(nowMs));
			// Get count
			const count = await redis.zcard(rk);
			// Set TTL slightly over window to allow cleanup
			await redis.pexpire(rk, windowMs + 1000);
			if (count > max) {
				// Find earliest remaining to compute retry
				const oldest = await redis.zrange(rk, 0, 0, 'WITHSCORES');
				const oldestScore = Number(oldest[1] ?? nowMs);
				const retryAfterSec = Math.ceil((windowMs - (nowMs - oldestScore)) / 1000);
				return { allowed: false, retryAfterSec };
			}
			return { allowed: true };
		},
	};
}

export function resolveRateLimitStoreFromEnv(): RateLimitStore | undefined {
	const url = process.env.PRP_REDIS_URL || process.env.REDIS_URL;
	if (!url) return undefined;
	try {
		const client = new Redis(url);
		return createRedisStore(client);
	} catch {
		return undefined;
	}
}

export type KeyFn = (req: Request) => string;
