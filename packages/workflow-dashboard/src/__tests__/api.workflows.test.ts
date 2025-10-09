import type { Server } from 'node:http';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from '../server/index.js';

describe('Dashboard API', () => {
	let server: Server;
	let app: Express;

	beforeAll(async () => {
		app = await createServer({ port: 0 }); // Random port
		server = await new Promise((resolve) => {
			const s = app.listen(0, () => resolve(s));
		});
	});

	afterAll(async () => {
		await new Promise((resolve, reject) => {
			server.close((err) => (err ? reject(err) : resolve(undefined)));
		});
	});

	describe('GET /api/workflows', () => {
		it('should return workflow list with brAInwav branding', async () => {
			const response = await request(app).get('/api/workflows');

			expect(response.status).toBe(200);
			expect(response.body.branding).toBe('brAInwav');
			expect(response.body.workflows).toBeInstanceOf(Array);
		});

		it('should include progress percentage', async () => {
			const response = await request(app).get('/api/workflows');

			if (response.body.workflows.length > 0) {
				const workflow = response.body.workflows[0];
				expect(workflow.progress).toBeGreaterThanOrEqual(0);
				expect(workflow.progress).toBeLessThanOrEqual(100);
			}
		});
	});

	describe('GET /api/workflows/:id', () => {
		it('should return 404 for non-existent workflow', async () => {
			const response = await request(app).get('/api/workflows/non-existent');

			expect(response.status).toBe(404);
			expect(response.body.error).toContain('brAInwav');
		});
	});

	describe('POST /api/workflows/:id/approve', () => {
		it('should validate approval request schema', async () => {
			const response = await request(app)
				.post('/api/workflows/wf-test-123/approve')
				.send({ decision: 'invalid' }); // Missing required fields

			expect(response.status).toBe(400);
			expect(response.body.error).toContain('validation');
		});
	});

	describe('Health Check', () => {
		it('should return health status', async () => {
			const response = await request(app).get('/api/health');

			expect(response.status).toBe(200);
			expect(response.body.status).toBe('ok');
			expect(response.body.branding).toBe('brAInwav');
		});
	});
});
