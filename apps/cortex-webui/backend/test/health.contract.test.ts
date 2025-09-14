import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createTestServer, type TestServer } from './testServer';

// Contract schema for /health endpoint response
const healthResponseSchema = z.object({
	status: z.literal('OK'),
	timestamp: z.string().datetime(),
});

describe('contract: GET /health', () => {
	let testServer: TestServer;

	beforeAll(async () => {
		testServer = await createTestServer();
	});

	afterAll(async () => {
		await testServer.stop();
	});

	it('returns 200 with valid schema', async () => {
		const res = await request(testServer.url).get('/health').expect(200);

		// Contract validation using zod
		const parsed = healthResponseSchema.parse(res.body);
		expect(parsed.status).toBe('OK');
		expect(new Date(parsed.timestamp)).toBeInstanceOf(Date);
	});

	it('responds quickly (performance contract)', async () => {
		const start = Date.now();
		await request(testServer.url).get('/health').expect(200);
		const duration = Date.now() - start;
		expect(duration).toBeLessThan(100); // Health should respond within 100ms
	});
});
