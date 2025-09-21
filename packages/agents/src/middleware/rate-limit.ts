import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

/** Default rate limit window: 60 seconds */
const DEFAULT_WINDOW_MS = 60 * 1000;

/** Default maximum requests per window */
const DEFAULT_MAX_REQUESTS = 100;

export interface RateLimitStore {
	get(key: string): Promise<number | null>;
	set(key: string, value: number, ttlMs: number): Promise<void>;
	incr(key: string): Promise<number>;
	ttl(key: string): Promise<number>;
}

export interface RateLimiterConfig {
	/** Time window in milliseconds */
	readonly windowMs?: number;
	/** Maximum number of requests allowed in the window */
	readonly maxRequests?: number;
	/** Function to generate unique keys for rate limiting */
	readonly keyGenerator?: (c: Context) => string;
	/** Function to determine if rate limiting should be skipped */
	readonly skip?: (c: Context) => boolean;
	/** Custom store for distributed rate limiting */
	readonly store?: RateLimitStore;
}

// interface RateLimitInfo {
//   count: number;
//   resetTime: number;
// }

/**
 * Rate limiting middleware for Hono applications
 *
 * Supports multiple strategies:
 * - Fixed window counter with memory store
 * - Per-user rate limiting
 * - Admin bypass
 * - Custom key generation
 * - Distributed stores (Redis, etc.)
 */
export class RateLimiter {
	private readonly windowMs: number;
	private readonly maxRequests: number;
	private readonly keyGenerator: (c: Context) => string;
	private readonly skip: (c: Context) => boolean;
	private readonly store: RateLimitStore;
	// private readonly cache = new Map<string, RateLimitInfo>();

	constructor(config: RateLimiterConfig = {}) {
		this.windowMs = config.windowMs ?? DEFAULT_WINDOW_MS;
		this.maxRequests = config.maxRequests ?? DEFAULT_MAX_REQUESTS;
		this.keyGenerator = config.keyGenerator || this.defaultKeyGenerator;
		this.skip = config.skip || this.defaultSkip;
		this.store = config.store || new MemoryStore(this.windowMs);
	}

	/**
	 * Returns Hono middleware function for rate limiting
	 * @returns Hono middleware function
	 */
	middleware() {
		return async (c: Context, next: Next) => {
			// Check if should skip rate limiting
			if (this.skip(c)) {
				await next();
				return;
			}

			const key = this.keyGenerator(c);
			const now = Date.now();
			// const windowStart = now - this.windowMs;

			// Get current count
			const count = await this.store.incr(key);

			// Set expiry if this is a new key
			if (count === 1) {
				await this.store.set(key, count, this.windowMs);
			}

			// Get TTL to check if window has expired
			const ttl = await this.store.ttl(key);
			const resetTime = now + ttl * 1000;

			// Check if over limit
			if (count > this.maxRequests) {
				const retryAfter = Math.ceil(ttl);
				c.res.headers.set('X-RateLimit-Limit', this.maxRequests.toString());
				c.res.headers.set('X-RateLimit-Remaining', '0');
				c.res.headers.set('X-RateLimit-Reset', resetTime.toString());
				c.res.headers.set('Retry-After', retryAfter.toString());

				throw new HTTPException(429, {
					message: 'Too many requests',
				});
			}

			// Add rate limit headers
			const remaining = Math.max(0, this.maxRequests - count);
			c.res.headers.set('X-RateLimit-Limit', this.maxRequests.toString());
			c.res.headers.set('X-RateLimit-Remaining', remaining.toString());
			c.res.headers.set('X-RateLimit-Reset', resetTime.toString());

			await next();
		};
	}

	private defaultKeyGenerator(c: Context): string {
		// Fallback since c.req.ip doesn't exist in Hono types
		return (
			c.req.header('X-User-ID') ||
			c.req.header('X-API-Key') ||
			c.req.header('X-Forwarded-For') ||
			'global'
		);
	}

	private defaultSkip(c: Context): boolean {
		return c.req.header('X-User-Role') === 'admin';
	}
}

class MemoryStore implements RateLimitStore {
	private readonly store = new Map<string, { value: number; expires: number }>();

	constructor(private windowMs: number) {}

	async get(key: string): Promise<number | null> {
		const item = this.store.get(key);
		if (!item) return null;

		if (Date.now() > item.expires) {
			this.store.delete(key);
			return null;
		}

		return item.value;
	}

	async set(key: string, value: number, ttlMs: number): Promise<void> {
		this.store.set(key, {
			value,
			expires: Date.now() + ttlMs,
		});
	}

	async incr(key: string): Promise<number> {
		const item = this.store.get(key);
		const now = Date.now();

		if (!item || now > item.expires) {
			const newValue = 1;
			this.store.set(key, {
				value: newValue,
				expires: now + this.windowMs,
			});
			return newValue;
		}

		item.value += 1;
		return item.value;
	}

	async ttl(key: string): Promise<number> {
		const item = this.store.get(key);
		if (!item) return -1;

		const remaining = item.expires - Date.now();
		return Math.max(0, Math.ceil(remaining / 1000));
	}
}
