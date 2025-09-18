import type { Request, Response } from 'express';
import { describe, expect, it } from 'vitest';
import { createRedisRateLimiter, RedisRateLimiter } from '../src/middleware/redisRateLimiter';

// Test constants to avoid hardcoded IPs
const _TEST_IP = '203.0.113.1'; // RFC 5737 test IP range
const _TEST_FORWARDED_IP = '203.0.113.2'; // RFC 5737 test IP range

function _mockRequest(ip = '127.0.0.1', headers: Record<string, string> = {}): Request {
	return { ip, headers } as Request;
}

interface MockResponse extends Response {
	statusCode: number;
	sendCalled: boolean;
	headers: Record<string, unknown>;
}

function _mockResponse(): MockResponse {
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

describe('redisRateLimiter', () => {
	it('creates a Redis rate limiter instance', () => {
		const limiter = createRedisRateLimiter({ limit: 10, windowMs: 60000 });
		expect(limiter).toBeDefined();
	});

	it('initializes RedisRateLimiter class', () => {
		const limiter = new RedisRateLimiter({ limit: 10, windowMs: 60000 });
		expect(limiter).toBeDefined();
	});
});
