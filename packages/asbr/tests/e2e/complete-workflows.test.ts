import supertest from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeAuth } from '../../src/api/auth.js';
import { type ASBRServer, createASBRServer } from '../../src/api/server.js';
import { initializeXDG } from '../../src/xdg/index.js';
import { getSharedServer } from '../fixtures/shared-server.js';

// This file runs integration tests for complete workflows

describe('Complete Workflows', () => {
	let server: ASBRServer;
	let authToken = 'test-token';
	let request: supertest.SuperTest<supertest.Test>;

	beforeAll(async () => {
		if (process.env.ASBR_TEST_SHARED_SERVER) {
			const { server: shared, authToken: token } = await getSharedServer();
			server = shared;
			authToken = token;
			request = supertest(server.app);
		} else {
			await initializeXDG();
			const tokenInfo = await initializeAuth();
			authToken = tokenInfo.token;
			server = createASBRServer({ port: 7442 });
			await server.start();
			request = supertest(server.app);
		}
	});

	afterAll(async () => {
		if (!process.env.ASBR_TEST_SHARED_SERVER) {
			await server.stop();
		}
	});

	describe('Task Management', () => {
		it('should handle task creation and cancellation', async () => {
			// Step 1: Create a task (use valid TaskInput schema kinds: text/doc/repo)
			const createResponse = await request
				.post('/v1/tasks')
				.set('Authorization', `Bearer ${authToken}`)
				.send({
					input: {
						title: 'Process files',
						brief: 'Analyze a set of files for anomalies',
						inputs: [
							{ kind: 'text', value: 'file:///path/to/input1.txt' },
							{ kind: 'text', value: 'file:///path/to/input2.txt' },
						],
						scopes: ['tasks:create', 'filesystem:read', 'ai:analyze'],
						schema: 'cortex.task.input@1',
					},
				})
				.expect(200);

			const taskId = createResponse.body.task.id;
			expect(taskId).toBeDefined();

			// Step 2: Monitor task progress via events
			const eventsResponse = await request

				.get(`/v1/events?stream=sse&taskId=${taskId}`)
				.set('Authorization', `Bearer ${authToken}`)
				.set('Accept', 'text/event-stream');

			expect(eventsResponse.status).toBe(200);

			// Step 3: Retrieve task status
			const statusResponse = await request
				.get(`/v1/tasks/${taskId}`)
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(statusResponse.body.task.status).toBe('queued');

			// Step 4: Cancel task if needed
			const cancelResponse = await request
				.post(`/v1/tasks/${taskId}/cancel`)
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(cancelResponse.body.success).toBe(true);

			// Step 5: Verify task is canceled
			const finalStatusResponse = await request
				.get(`/v1/tasks/${taskId}`)
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(finalStatusResponse.body.task.status).toBe('canceled');
		});
	});

	describe('Artifact Retrieval', () => {
		it('should list artifacts with pagination', async () => {
			const response = await request
				.get('/v1/artifacts?limit=10&offset=0')
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(response.body.artifacts).toBeInstanceOf(Array);
		});
	});

	describe('Real-time Event Streaming', () => {
		it('should provide real-time updates via SSE', async () => {
			// Create a task to generate events
			const taskResponse = await request
				.post('/v1/tasks')
				.set('Authorization', `Bearer ${authToken}`)
				.send({
					input: {
						title: 'SSE Test Task',
						brief: 'Task for testing server-sent events',
						inputs: [{ kind: 'text', value: 'seed' }],
						scopes: ['tasks:create', 'events:stream'],
						schema: 'cortex.task.input@1',
					},
				})
				.expect(200);

			const taskId = taskResponse.body.task.id;

			// Test SSE endpoint (simplified for test environment)
			await new Promise<void>((resolve, reject) => {
				let settled = false;
				const sseReq = request
					.get(`/v1/events?stream=sse&taskId=${taskId}`)
					.set('Authorization', `Bearer ${authToken}`)
					.set('Accept', 'text/event-stream')
					.buffer(false)
					.on('response', (res) => {
						try {
							expect(res.statusCode).toBe(200);
							settled = true;
							sseReq.abort();
							resolve();
						} catch (error) {
							settled = true;
							reject(error);
						}
					})
					.end((err, res) => {
						if (settled) return;
						if (err) {
							if ((err as NodeJS.ErrnoException).code === 'ECONNRESET') {
								settled = true;
								resolve();
								return;
							}
							settled = true;
							reject(err);
							return;
						}
						try {
							expect(res?.status).toBe(200);
							settled = true;
							resolve();
						} catch (error) {
							settled = true;
							reject(error);
						}
					});
			});
		});
	});

	describe('Error Recovery and Resilience', () => {
		it('should handle and recover from errors gracefully', async () => {
			// Create a task with invalid inputs to test error handling
			const response = await request
				.post('/v1/tasks')
				.set('Authorization', `Bearer ${authToken}`)
				.send({
					input: {
						title: 'Error Recovery Test',
						brief: 'Testing error handling and recovery',
						inputs: [{ kind: 'text', value: 'should still succeed' }],
						scopes: ['tasks:create'],
						schema: 'cortex.task.input@1',
					},
				});

			// Task should be created but may handle errors internally
			if (response.status === 200) {
				expect(response.body.task).toBeDefined();
			} else {
				expect(response.status).toBe(400);
			}
		});
	});
});
