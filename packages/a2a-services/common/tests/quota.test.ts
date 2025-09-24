import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { createQuota } from '../src/middleware/quota.js';

function mockRequest(): Request {
	return {} as Request;
}

interface MockResponse extends Response {
	statusCode: number;
	sendCalled: boolean;
}

function mockResponse(): MockResponse {
	const res: Partial<MockResponse> = {
		statusCode: 200,
		sendCalled: false,
		status(code: number) {
			res.statusCode = code;
			return res as MockResponse;
		},
		send() {
			res.sendCalled = true;
			return res as MockResponse;
		},
	};
	return res as MockResponse;
}

describe('quota', () => {
	it('enforces a global quota', () => {
		const quota = createQuota({ globalLimit: 2 });
		const req = mockRequest();
		const next = vi.fn();

		const res1 = mockResponse();
		quota(req, res1, next);
		const res2 = mockResponse();
		quota(req, res2, next);
		const res3 = mockResponse();
		quota(req, res3, next);

		expect(next).toHaveBeenCalledTimes(2);
		expect(res3.statusCode).toBe(429);
		expect(res3.sendCalled).toBe(true);
	});
});
