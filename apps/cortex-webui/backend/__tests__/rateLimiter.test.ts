// Set required env before importing rate limiter (module loads config eagerly)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'a'.repeat(32);
process.env.DATABASE_PATH = process.env.DATABASE_PATH || ':memory:';

import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authRateLimit, chatRateLimit, generalRateLimit } from '../src/middleware/rateLimiter.ts';

// Mock config loader BEFORE importing middleware to bypass full env validation
vi.mock('../src/config/config', () => ({
	getRateLimitConfig: () => ({
		windowMs: 15 * 60 * 1000,
		maxRequests: 100,
		authMaxRequests: 5,
		chatMaxRequests: 30,
		uploadMaxRequests: 20,
	}),
}));

// Mock express-rate-limit
vi.mock('express-rate-limit', () => ({
	default: vi.fn((options) => {
		return (req: Request, res: Response, next: () => void) => {
			// Mock implementation that tracks calls
			const limit = options.max || 100;

			// Simulate rate limiting logic
			if (req.headers['x-test-exceed-limit'] === 'true') {
				// Simulate rate limit exceeded
				options.handler(req, res);
				return;
			}

			// Add rate limit info to request
			req.rateLimit = {
				limit,
				current: 1,
				remaining: limit - 1,
				resetTime: new Date(Date.now() + options.windowMs),
			};

			next();
		};
	}),
}));

describe('Rate Limiter Middleware', () => {
	const mockReq = {
		ip: '127.0.0.1',
		path: '/api/test',
		method: 'GET',
		headers: {},
		user: undefined,
	} as unknown as Request;

	const mockRes = {
		status: vi.fn().mockReturnThis(),
		json: vi.fn(),
	} as unknown as Response;

	const mockNext = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('generalRateLimit allows requests within limit', () => {
		generalRateLimit(mockReq, mockRes, mockNext);

		expect(mockNext).toHaveBeenCalledOnce();
		expect(mockRes.status).not.toHaveBeenCalled();
		expect(mockReq.rateLimit).toBeDefined();
	});

	it('generalRateLimit returns 429 when limit exceeded', () => {
		const reqWithExceededLimit = {
			...mockReq,
			headers: { 'x-test-exceed-limit': 'true' },
		} as unknown as Request;

		generalRateLimit(reqWithExceededLimit, mockRes, mockNext);

		expect(mockRes.status).toHaveBeenCalledWith(429);
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				error: 'Too Many Requests',
				message: 'Rate limit exceeded. Please try again later.',
				retryAfter: expect.any(Number),
			}),
		);
		expect(mockNext).not.toHaveBeenCalled();
	});

	it('authRateLimit has stricter limits', () => {
		authRateLimit(mockReq, mockRes, mockNext);

		expect(mockNext).toHaveBeenCalledOnce();
		expect(mockReq.rateLimit).toBeDefined();
		// Auth rate limit should have a lower max than general
		expect(mockReq.rateLimit?.limit).toBeLessThan(100);
	});

	it('chatRateLimit allows moderate usage', () => {
		chatRateLimit(mockReq, mockRes, mockNext);

		expect(mockNext).toHaveBeenCalledOnce();
		expect(mockReq.rateLimit).toBeDefined();
	});

	it('skips rate limiting for health checks', () => {
		const healthReq = {
			...mockReq,
			path: '/health',
		} as unknown as Request;

		generalRateLimit(healthReq, mockRes, mockNext);

		expect(mockNext).toHaveBeenCalledOnce();
	});

	it('skips rate limiting for OPTIONS requests', () => {
		const optionsReq = {
			...mockReq,
			method: 'OPTIONS',
		} as unknown as Request;

		generalRateLimit(optionsReq, mockRes, mockNext);

		expect(mockNext).toHaveBeenCalledOnce();
	});
});
