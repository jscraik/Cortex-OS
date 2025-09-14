import express from 'express';
import request from 'supertest';
import { describe, it } from 'vitest';
import { createPerAgentQuota } from '../src/middleware/perAgentQuota';

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
		await agentA().expect(429);

		// Agent B: can still use its own quota
		await agentB().expect(200);
		await agentB().expect(200);
		// Global limit reached now (5th request) -> further requests blocked
		await agentB().expect(429);
	});
});
