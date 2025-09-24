import { beforeEach, describe, expect, it } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');

import crypto from 'node:crypto';
import { CortexWebhookServer } from '../../src/server/webhook-server.js';

describe('AI /webhook signature', () => {
	const fakeApp = {
		queueSize: 0,
		activeTaskCount: 0,
		rateLimit: { remaining: 0, resetAt: new Date() },
		queueTask: async () => 'task_1',
	};
	const server = new CortexWebhookServer(
		fakeApp as unknown as import('../../src/core/ai-github-app').CortexAiGitHubApp,
		'secret',
	);
	const app = server.expressApp;

	beforeEach(() => {
		process.env.NODE_ENV = 'test';
	});

	it('rejects missing headers with 400', async () => {
		const res = await request(app).post('/webhook').send('{}');
		expect(res.status).toBe(400);
	});

	it('rejects invalid signature with 401', async () => {
		const res = await request(app)
			.post('/webhook')
			.set('X-GitHub-Event', 'issues')
			.set('X-GitHub-Delivery', 'd1')
			.set('X-Hub-Signature-256', 'sha256=deadbeef')
			.set('Content-Type', 'application/json')
			.send(Buffer.from('{}'));
		expect(res.status).toBe(401);
	});

	it('accepts valid signature with 200', async () => {
		const body = Buffer.from(
			JSON.stringify({ action: 'opened', repository: { owner: { login: 'o' }, name: 'r' } }),
		);
		const sig = crypto.createHmac('sha256', 'secret').update(body).digest('hex');
		const res = await request(app)
			.post('/webhook')
			.set('X-GitHub-Event', 'issues')
			.set('X-GitHub-Delivery', 'd2')
			.set('X-Hub-Signature-256', `sha256=${sig}`)
			.set('Content-Type', 'application/json')
			.send(body);
		expect(res.status).toBe(200);
		expect(res.body.received).toBe(true);
	});
});
