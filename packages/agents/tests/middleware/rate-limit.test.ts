import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimiter } from '../../src/middleware/rate-limit.js';

describe('Rate Limiter Middleware', () => {
	let app: Hono;
	let rateLimiter: RateLimiter;
	let mockDateNow: number;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		mockDateNow = Date.now();
		vi.spyOn(Date, 'now').mockImplementation(() => mockDateNow);

		app = new Hono();
		rateLimiter = new RateLimiter({
			windowMs: 60000, // 1 minute
			maxRequests: 5,
		});

		app.use('*', async (c, next) => {
			try {
				await next();
			} catch (err) {
				if (err instanceof HTTPException) {
					return c.json(
						{
							error: {
								code: err.status,
								message: err.message,
							},
						},
						err.status,
					);
				}
				throw err;
			}
		});
		app.use('/test', rateLimiter.middleware());
		app.get('/test', (c) => c.json({ success: true }));
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	describe('Basic rate limiting', () => {
		it('should allow requests within limit', async () => {
			// RED: Test fails because implementation doesn't exist
			for (let i = 0; i < 5; i++) {
				const res = await app.request('/test');
				expect(res.status).toBe(200);
			}
		});

		it('should block requests exceeding limit', async () => {
			// RED: Test fails because implementation doesn't exist
			// Make 6 requests (exceeds limit of 5)
			const responses = [];
			for (let i = 0; i < 6; i++) {
				responses.push(await app.request('/test'));
			}

			// First 5 should succeed
			for (let i = 0; i < 5; i++) {
				expect(responses[i].status).toBe(200);
			}

			// 6th should be blocked
			expect(responses[5].status).toBe(429);
			const text = await responses[5].text();
			expect(text).toBe('Too many requests');
		});

		it('should reset window after time expires', async () => {
			// RED: Test fails because implementation doesn't exist
			// Use up all requests
			for (let i = 0; i < 5; i++) {
				const res = await app.request('/test');
				expect(res.status).toBe(200);
			}

			// Next request should be blocked
			const blockedRes = await app.request('/test');
			expect(blockedRes.status).toBe(429);

			// Advance time past window
			vi.advanceTimersByTime(61000);
			mockDateNow += 61000;

			// Should allow requests again
			const res = await app.request('/test');
			expect(res.status).toBe(200);
		});
	});

	describe('Per-user rate limiting', () => {
		it('should track requests separately for different users', async () => {
			// RED: Test fails because implementation doesn't exist
			const user1Headers = { 'X-User-ID': 'user1' };
			const user2Headers = { 'X-User-ID': 'user2' };

			// User 1 makes 5 requests
			for (let i = 0; i < 5; i++) {
				const res = await app.request('/test', { headers: user1Headers });
				expect(res.status).toBe(200);
			}

			// User 1 should be blocked
			const user1Blocked = await app.request('/test', { headers: user1Headers });
			expect(user1Blocked.status).toBe(429);

			// User 2 should still be able to make requests
			for (let i = 0; i < 5; i++) {
				const res = await app.request('/test', { headers: user2Headers });
				expect(res.status).toBe(200);
			}
		});
	});

	describe('Rate limit headers', () => {
		it('should include rate limit headers in responses', async () => {
			// RED: Test fails because implementation doesn't exist
			const res = await app.request('/test');

			expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
			expect(res.headers.get('X-RateLimit-Remaining')).toBe('4');
			expect(res.headers.get('X-RateLimit-Reset')).toBeDefined();
		});

		it('should update remaining count correctly', async () => {
			// RED: Test fails because implementation doesn't exist
			let res = await app.request('/test');
			expect(res.headers.get('X-RateLimit-Remaining')).toBe('4');

			res = await app.request('/test');
			expect(res.headers.get('X-RateLimit-Remaining')).toBe('3');
		});
	});

	describe('Admin bypass', () => {
		it('should allow admin users to bypass rate limits', async () => {
			// RED: Test fails because implementation doesn't exist
			const adminHeaders = { 'X-User-Role': 'admin' };

			// Admin can make more than limit
			for (let i = 0; i < 10; i++) {
				const res = await app.request('/test', { headers: adminHeaders });
				expect(res.status).toBe(200);
			}
		});
	});

	describe('Custom configuration', () => {
		it('should use custom key generator', async () => {
			// RED: Test fails because implementation doesn't exist
			const customLimiter = new RateLimiter({
				windowMs: 60000,
				maxRequests: 3,
				keyGenerator: (c) => c.req.header('X-API-Key') || 'default',
			});

			const customApp = new Hono();
			customApp.use('*', async (c, next) => {
				try {
					await next();
				} catch (err) {
					if (err instanceof HTTPException) {
						return c.json(
							{
								error: {
									code: err.status,
									message: err.message,
								},
							},
							err.status,
						);
					}
					throw err;
				}
			});
			customApp.use('/custom', customLimiter.middleware());
			customApp.get('/custom', (c) => c.json({ success: true }));

			const key1 = { 'X-API-Key': 'key1' };
			const key2 = { 'X-API-Key': 'key2' };

			// Use up limit for key1
			for (let i = 0; i < 3; i++) {
				const res = await customApp.request('/custom', { headers: key1 });
				expect(res.status).toBe(200);
			}

			// key1 should be blocked
			const blocked = await customApp.request('/custom', { headers: key1 });
			expect(blocked.status).toBe(429);

			// key2 should still work
			const res = await customApp.request('/custom', { headers: key2 });
			expect(res.status).toBe(200);
		});
	});

	describe('Distributed rate limiting', () => {
		it('should support distributed store', async () => {
			// RED: Test fails because implementation doesn't exist
			const mockStore = {
				get: vi.fn(),
				set: vi.fn(),
				incr: vi.fn(),
				ttl: vi.fn(),
			};

			const distributedLimiter = new RateLimiter({
				windowMs: 60000,
				maxRequests: 2,
				store: mockStore,
			});

			// Mock store behavior
			mockStore.incr.mockResolvedValue(1);
			mockStore.ttl.mockResolvedValue(60);

			const distributedApp = new Hono();
			distributedApp.use('*', async (c, next) => {
				try {
					await next();
				} catch (err) {
					if (err instanceof HTTPException) {
						return c.json(
							{
								error: {
									code: err.status,
									message: err.message,
								},
							},
							err.status,
						);
					}
					throw err;
				}
			});
			distributedApp.use('/dist', distributedLimiter.middleware());
			distributedApp.get('/dist', (c) => c.json({ success: true }));

			const res = await distributedApp.request('/dist');
			expect(res.status).toBe(200);
			expect(mockStore.incr).toHaveBeenCalled();
		});
	});
});
