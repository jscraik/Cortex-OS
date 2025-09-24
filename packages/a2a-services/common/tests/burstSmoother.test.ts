import express from 'express';
import request from 'supertest';
import { describe, it } from 'vitest';
import { createBurstSmoother } from '../src/middleware/burstSmoother.js';

describe('createBurstSmoother', () => {
	it('enforces burst then sustained rate', async () => {
		let now = 0;
		const smoother = createBurstSmoother({
			ratePerSec: 2,
			burst: 4,
			now: () => now,
		});
		const app = express();
		app.use(smoother);
		app.get('/', (_req, res) => res.json({ ok: true }));

		for (let i = 0; i < 4; i++) await request(app).get('/').expect(200);
		await request(app).get('/').expect(429); // exceeds burst

		now = 500; // +0.5s -> +1 token
		await request(app).get('/').expect(200);
		await request(app).get('/').expect(429); // no second token yet

		now = 1500; // total 1.5s -> 3 tokens gained minus 1 consumed above => 2 available
		await request(app).get('/').expect(200);
		await request(app).get('/').expect(200);
	});

	it('separates buckets per header value', async () => {
		let now = 0;
		const smoother = createBurstSmoother({
			ratePerSec: 1,
			burst: 2,
			keyHeader: 'x-agent-id',
			now: () => now,
		});
		const app = express();
		app.use(smoother);
		app.get('/', (_req, res) => res.json({ ok: true }));

		await request(app).get('/').set('x-agent-id', 'A').expect(200);
		await request(app).get('/').set('x-agent-id', 'A').expect(200);
		const blockedA = await request(app).get('/').set('x-agent-id', 'A').expect(429);
		expect(blockedA.status).toBe(429);

		await request(app).get('/').set('x-agent-id', 'B').expect(200);
		await request(app).get('/').set('x-agent-id', 'B').expect(200);
		const blockedB = await request(app).get('/').set('x-agent-id', 'B').expect(429);
		expect(blockedB.status).toBe(429);

		now = 1000; // +1s refill one token each bucket
		await request(app).get('/').set('x-agent-id', 'A').expect(200);
		await request(app).get('/').set('x-agent-id', 'B').expect(200);
	});
});
