import { performance } from 'node:perf_hooks';
import supertest from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeAuth } from '../../src/api/auth.js';
import { type ASBRServer, createASBRServer } from '../../src/api/server.js';
import { initializeXDG } from '../../src/xdg/index.js';
import { finalizeMetrics, recordMetric } from '../utils/perf-metrics.js';

// @perf
describe('ASBR API Performance Tests', () => {
	let server: ASBRServer;
	// Using ReturnType of supertest factory to avoid type mismatch with URLType overloads.
	let request: ReturnType<typeof supertest>;
	let authToken: string;

	// Allow slightly higher thresholds in CI where shared runners and cold caches add overhead.
	const THRESHOLDS = {
		healthCheck: 300,
		taskCreate: process.env.CI ? 200 : 150, // previously 120ms (flaky on cold start ~155ms)
		taskRetrieve: 50,
		concurrentBatch: 500,
		sseOpen: process.env.ASBR_TEST_SHARED_SERVER ? 300 : 200,
	};

	beforeAll(async () => {
		await initializeXDG();
		const tokenInfo = await initializeAuth();
		authToken = tokenInfo.token;

		server = createASBRServer({ port: 7440 });
		await server.start();
		request = supertest(`http://127.0.0.1:7440`);

		// Warm-up: perform a health check and one task creation to mitigate cold-start
		await request.get('/health').expect(200);
		await request
			.post('/v1/tasks')
			.set('Authorization', `Bearer ${authToken}`)
			.send({
				input: {
					title: 'Warmup Task',
					brief: 'Priming caches and JIT',
					inputs: [],
					scopes: ['tasks:create'],
					schema: 'cortex.task.input@1',
				},
			})
			.expect(200);
	});

	afterAll(async () => {
		await server.stop();
		finalizeMetrics();
	});

	it('should respond to health check within threshold', async () => {
		const start = performance.now();

		const response = await request.get('/health').expect(200);

		const duration = performance.now() - start;

		expect(response.body).toEqual({
			status: 'ok',
			timestamp: expect.any(String),
		});
		recordMetric('health.check', duration);
		expect(duration).toBeLessThan(THRESHOLDS.healthCheck); // Allow cold-start & single-worker overhead
	});

	it('should create tasks within threshold', async () => {
		const start = performance.now();

		const response = await request
			.post('/v1/tasks')
			.set('Authorization', `Bearer ${authToken}`)
			.send({
				input: {
					title: 'Performance Test Task',
					brief: 'Testing task creation performance',
					inputs: [],
					scopes: ['tasks:create'],
					schema: 'cortex.task.input@1',
				},
			})
			.expect(200);

		const duration = performance.now() - start;

		expect(response.body.task).toBeDefined();
		recordMetric('task.create', duration);
		expect(duration).toBeLessThan(THRESHOLDS.taskCreate);
	});

	it('should retrieve tasks within 50ms', async () => {
		// First create a task
		const createResponse = await request
			.post('/v1/tasks')
			.set('Authorization', `Bearer ${authToken}`)
			.send({
				input: {
					title: 'Retrieve Performance Test',
					brief: 'Testing task retrieval performance',
					inputs: [],
					scopes: ['tasks:create'],
					schema: 'cortex.task.input@1',
				},
			});

		const taskId = createResponse.body.task.id;

		const start = performance.now();

		const response = await request
			.get(`/v1/tasks/${taskId}`)
			.set('Authorization', `Bearer ${authToken}`)
			.expect(200);

		const duration = performance.now() - start;

		expect(response.body.task.id).toBe(taskId);
		recordMetric('task.retrieve', duration);
		expect(duration).toBeLessThan(THRESHOLDS.taskRetrieve);
	});

	it('should handle concurrent requests efficiently', async () => {
		const start = performance.now();

		// Create 10 concurrent requests
		const promises = Array.from({ length: 10 }, (_, i) =>
			request
				.post('/v1/tasks')
				.set('Authorization', `Bearer ${authToken}`)
				.send({
					input: {
						title: `Concurrent Test Task ${i}`,
						brief: 'Testing concurrent performance',
						inputs: [],
						scopes: ['tasks:create'],
						schema: 'cortex.task.input@1',
					},
				}),
		);

		const responses = await Promise.all(promises);
		const duration = performance.now() - start;

		// All requests should succeed
		responses.forEach((response) => {
			expect(response.status).toBe(200);
			expect(response.body.task).toBeDefined();
		});

		// Total time should be reasonable for 10 concurrent requests
		recordMetric('tasks.concurrent.batch', duration);
		expect(duration).toBeLessThan(THRESHOLDS.concurrentBatch);
	});

	it('should serve SSE events efficiently', async () => {
		const start = performance.now();

		const response = await request
			.get('/v1/events?stream=sse')
			.set('Authorization', `Bearer ${authToken}`)
			.set('Accept', 'text/event-stream');

		const duration = performance.now() - start;

		expect(response.status).toBe(200);
		recordMetric('sse.initial.open', duration);
		expect(duration).toBeLessThan(THRESHOLDS.sseOpen);
	});

	it('should handle SSE connections efficiently', async () => {
		const start = performance.now();

		const response = await request
			.get('/v1/events?stream=sse')
			.set('Authorization', `Bearer ${authToken}`)
			.set('Accept', 'text/event-stream');

		const duration = performance.now() - start;

		// SSE should establish quickly (server auto-closes in test env)
		recordMetric('sse.connection.open', duration);
		expect(duration).toBeLessThan(THRESHOLDS.sseOpen);
		expect(response.status).toBe(200);
	});
});
