import express from 'express';
import request from 'supertest';
import { describe, it } from 'vitest';
import { createPerAgentQuota } from '../src/middleware/perAgentQuota.js';

describe('Per-Agent Quota Middleware', () => {
	it('enforces per-agent and global limits', async () => {
		const app = express();
		app.use(
			createPerAgentQuota({
				globalLimit: 5,
				perAgentLimit: 2,
				windowMs: 10_000,
			}),
		);
		app.get('/test', (_req, res) => res.json({ ok: true }));

		const agentA = () => request(app).get('/test').set('x-agent-id', 'A');
		const agentB = () => request(app).get('/test').set('x-agent-id', 'B');

		// Agent A: 2 allowed, 3rd blocked
		await agentA().expect(200);
		await agentA().expect(200);
		const response = await agentA().expect(429);
		expect(response.status).toBe(429);

		// Agent B: can still use its own quota
		await agentB().expect(200);
		await agentB().expect(200);
		// Global limit reached now (5th request) -> further requests blocked
		const finalResponse = await agentB().expect(429);
		expect(finalResponse.status).toBe(429);
	});
});
