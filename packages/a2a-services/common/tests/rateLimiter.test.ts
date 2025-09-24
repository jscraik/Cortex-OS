import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { createRateLimiter } from '../src/middleware/rateLimiter.js';

// Test constants to avoid hardcoded IPs
const _TEST_IP = '203.0.113.1'; // RFC 5737 test IP range
const TEST_FORWARDED_IP = '203.0.113.2'; // RFC 5737 test IP range

function mockRequest(ip = '127.0.0.1', headers: Record<string, string> = {}): Request {
	return { ip, headers } as Request;
}

interface MockResponse extends Response {
	statusCode: number;
	sendCalled: boolean;
	headers: Record<string, unknown>;
}

function mockResponse(): MockResponse {
	const res: Partial<MockResponse> = {
		statusCode: 200,
		sendCalled: false,
		headers: {},
		status(code: number) {
			res.statusCode = code;
			return res as MockResponse;
		},
		send() {
			res.sendCalled = true;
			return res as MockResponse;
		},
		setHeader(name: string, value: unknown) {
			if (res.headers) {
				res.headers[name] = value;
			}
			return res as MockResponse;
		},
	};
	return res as MockResponse;
}

describe('rateLimiter', () => {
	it('limits requests over the threshold', () => {
		const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
		const req = mockRequest();
		const next = vi.fn();

		const res1 = mockResponse();
		limiter(req, res1, next);
		const res2 = mockResponse();
		limiter(req, res2, next);
		const res3 = mockResponse();
		limiter(req, res3, next);

		expect(next).toHaveBeenCalledTimes(2);
		expect(res3.statusCode).toBe(429);
		expect(res3.sendCalled).toBe(true);
	});

	it('resets counters after window', () => {
		vi.useFakeTimers();
		const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
		const req = mockRequest();

		const res1 = mockResponse();
		const next1 = vi.fn();
		limiter(req, res1, next1);
		expect(next1).toHaveBeenCalledOnce();

		const res2 = mockResponse();
		const next2 = vi.fn();
		limiter(req, res2, next2);
		expect(res2.statusCode).toBe(429);

		vi.advanceTimersByTime(1000);

		const res3 = mockResponse();
		const next3 = vi.fn();
		limiter(req, res3, next3);
		expect(next3).toHaveBeenCalledOnce();
		expect(res3.statusCode).toBe(200);
		vi.useRealTimers();
	});

	it('uses x-forwarded-for header when present', () => {
		const limiter = createRateLimiter({ limit: 1 });
		const next = vi.fn();

		const req1 = mockRequest('127.0.0.1', {
			'x-forwarded-for': TEST_FORWARDED_IP,
		});
		const res1 = mockResponse();
		limiter(req1, res1, next);
		expect(next).toHaveBeenCalledTimes(1);

		const req2 = mockRequest('127.0.0.1', {
			'x-forwarded-for': TEST_FORWARDED_IP,
		});
		const res2 = mockResponse();
		limiter(req2, res2, next);
		expect(next).toHaveBeenCalledTimes(1);
		expect(res2.statusCode).toBe(429);

		const req3 = mockRequest('127.0.0.1');
		const res3 = mockResponse();
		limiter(req3, res3, next);
		expect(next).toHaveBeenCalledTimes(2);
	});

	it('sends a Retry-After header when rate limited', () => {
		const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
		const req = mockRequest();
		const next = vi.fn();

		const res1 = mockResponse();
		limiter(req, res1, next);

		const res2 = mockResponse();
		limiter(req, res2, next);

		expect(res2.statusCode).toBe(429);
		expect(res2.headers['Retry-After']).toBeDefined();
		expect(res2.headers['Retry-After']).toBeGreaterThan(0);
	});
});
