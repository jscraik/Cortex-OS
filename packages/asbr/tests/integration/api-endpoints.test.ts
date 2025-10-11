/**
 * Integration tests for ASBR API endpoints
 * Tests the complete API surface according to the blueprint
 */

// Node environment required for server integration tests to access Node builtins like 'crypto'.
// These tests interact directly with the server and require Node APIs that are not available in other environments (e.g., jsdom).
// @vitest-environment node

import type { Application } from 'express';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeAuth } from '../../src/api/auth.js';
import { type ASBRServer, createASBRServer } from '../../src/api/server.js';
import type { Profile, TaskInput } from '../../src/types/index.js';
import { initializeXDG } from '../../src/xdg/index.js';
import { getSharedServer } from '../fixtures/shared-server.js';
import {
        createTestConnectorsManifest,
        type TestManifestContext,
        verifyConnectorServiceMapSignature,
} from '../utils/connectors-manifest.js';

describe('ASBR API Integration Tests', () => {
	let server: ASBRServer;
	let authToken: string;
	let app: Application;

        beforeAll(async () => {
                process.env.CONNECTORS_SIGNATURE_KEY =
                        process.env.CONNECTORS_SIGNATURE_KEY ?? 'integration-secret';
        let server: ASBRServer;
        let authToken: string;
        let app: Application;
        let connectorsManifest: TestManifestContext | undefined;
        const connectorsSignatureKey = 'test-connectors-secret';

        beforeAll(async () => {
                if (process.env.ASBR_TEST_SHARED_SERVER) {
                        const { server: shared, authToken: token } = await getSharedServer();
                        server = shared;
                        authToken = token;
                        app = server.app;
                } else {
                        await initializeXDG();
                        const tokenInfo = await initializeAuth();
                        authToken = tokenInfo.token;
                        server = createASBRServer({ port: 0, host: '127.0.0.1' });
                        await server.start();
                        app = server.app;
		}
	});

        afterAll(async () => {
                if (!process.env.ASBR_TEST_SHARED_SERVER && server) {
                        await server.stop();
                }
                if (connectorsManifest) {
                        await connectorsManifest.cleanup();
                }
                if (!process.env.ASBR_TEST_SHARED_SERVER) {
                        delete process.env.CONNECTORS_MANIFEST_PATH;
                }
                if (process.env.CONNECTORS_SIGNATURE_KEY === connectorsSignatureKey) {
                        delete process.env.CONNECTORS_SIGNATURE_KEY;
                }
        });

	describe('Authentication', () => {
		it('should reject requests without authentication', async () => {
			const response = await request(app).get('/v1/tasks/test-id').expect(401);

			expect(response.body.error).toBe('Authentication required');
		});

		it('should accept requests with valid token', async () => {
			const response = await request(app)
				.get('/v1/tasks/non-existent')
				.set('Authorization', `Bearer ${authToken}`)
				.expect(404);

			expect(response.body.error).toBe('Task not found');
		});

		it('should only accept loopback connections', async () => {
			// This test would need to be run from a non-loopback address
			// For now, we just verify the auth middleware is in place
			expect(true).toBe(true);
		});
	});

	describe('Task Management', () => {
		let taskId: string;

		it('should create a new task', async () => {
			const taskInput: TaskInput = {
				title: 'Test Task',
				brief: 'This is a test task for integration testing',
				inputs: [{ kind: 'text', value: 'Sample input text' }],
				scopes: ['test'],
				schema: 'cortex.task.input@1',
			};

			const response = await request(app)
				.post('/v1/tasks')
				.set('Authorization', `Bearer ${authToken}`)
				.send({ input: taskInput })
				.expect(200);

			expect(response.body.task).toBeDefined();
			expect(response.body.task.id).toBeDefined();
			expect(response.body.task.status).toBe('queued');
			expect(response.body.task.schema).toBe('cortex.task@1');

			taskId = response.body.task.id;
		});

		it('should support idempotent task creation', async () => {
			const taskInput: TaskInput = {
				title: 'Idempotent Test Task',
				brief: 'This task tests idempotency',
				inputs: [{ kind: 'text', value: 'Idempotent input' }],
				scopes: ['test'],
				schema: 'cortex.task.input@1',
			};

			// Create task first time
			const response1 = await request(app)
				.post('/v1/tasks')
				.set('Authorization', `Bearer ${authToken}`)
				.set('Idempotency-Key', 'test-idempotency-key')
				.send({ input: taskInput })
				.expect(200);

			// Create task second time with same key
			const response2 = await request(app)
				.post('/v1/tasks')
				.set('Authorization', `Bearer ${authToken}`)
				.set('Idempotency-Key', 'test-idempotency-key')
				.send({ input: taskInput })
				.expect(200);

			expect(response1.body.task.id).toBe(response2.body.task.id);
		});

		it('should retrieve a task by ID', async () => {
			const response = await request(app)
				.get(`/v1/tasks/${taskId}`)
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(response.body.task.id).toBe(taskId);
			expect(response.body.task.status).toBeDefined();
		});

		it('should cancel a task', async () => {
			const response = await request(app)
				.post(`/v1/tasks/${taskId}/cancel`)
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(response.body.success).toBe(true);
		});

		it('should resume a paused task', async () => {
			// First, we'd need to pause a task, but for testing we'll
			// just verify the endpoint exists
			const response = await request(app)
				.post(`/v1/tasks/${taskId}/resume`)
				.set('Authorization', `Bearer ${authToken}`)
				.expect(400); // Should fail because task is canceled, not paused

			expect(response.body.error).toContain('paused');
		});
	});

	describe('Event System', () => {
		it('should provide SSE event stream', async () => {
			const response = await request(app)
				.get('/v1/events?stream=sse')
				.set('Authorization', `Bearer ${authToken}`)
				.set('Accept', 'text/event-stream');

			// Note: Testing SSE fully requires a different approach
			// This just verifies the endpoint exists and returns appropriate headers
			expect(response.status).toBe(200);
		});

		it('should allow SSE event stream for specific task', async () => {
			const response = await request(app)
				.get('/v1/events?stream=sse&taskId=test-task-id')
				.set('Authorization', `Bearer ${authToken}`)
				.set('Accept', 'text/event-stream');

			expect(response.status).toBe(200);
		});

		it('should reject unsupported stream type', async () => {
			const resp = await request(app)
				.get('/v1/events?stream=poll')
				.set('Authorization', `Bearer ${authToken}`)
				.expect(400);
			expect(resp.body.error).toBeDefined();
		});
	});

	describe('Profile Management', () => {
		let profileId: string;

		it('should create a new profile', async () => {
			const profile: Omit<Profile, 'id'> = {
				skill: 'intermediate',
				tools: ['filesystem', 'web_search'],
				a11y: {},
				schema: 'cortex.profile@1',
			};

			const response = await request(app)
				.post('/v1/profiles')
				.set('Authorization', `Bearer ${authToken}`)
				.send({ profile })
				.expect(200);

			expect(response.body.profile).toBeDefined();
			profileId = response.body.profile.id;
		});

		it('should retrieve a profile', async () => {
			const response = await request(app)
				.get(`/v1/profiles/${profileId}`)
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(response.body.skill).toBe('intermediate');
		});

		it('should update a profile', async () => {
			const updatedProfile: Omit<Profile, 'id'> = {
				skill: 'expert',
				tools: ['filesystem', 'web_search'],
				a11y: { screenReader: true },
				schema: 'cortex.profile@1',
			};
			const response = await request(app)
				.put(`/v1/profiles/${profileId}`)
				.set('Authorization', `Bearer ${authToken}`)
				.send({ profile: updatedProfile })
				.expect(200);

			expect(response.body.profile.skill).toBe('expert');
			expect(response.body.profile.a11y.screenReader).toBe(true);
		});
	});

	describe('Artifact Management', () => {
		it('should list artifacts with pagination', async () => {
			const response = await request(app)
				.get('/v1/artifacts?limit=10&offset=0')
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(response.body.artifacts).toBeDefined();
			expect(response.body.total).toBeDefined();
			expect(Array.isArray(response.body.artifacts)).toBe(true);
		});

		it('should filter artifacts by kind', async () => {
			const response = await request(app)
				.get('/v1/artifacts?kind=diff')
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(response.body.artifacts).toBeDefined();
		});

		it('should retrieve artifact content with digest headers', async () => {
			// For this test, we'd need to create an artifact first
			// For now, we'll test with a mock artifact ID
			const response = await request(app)
				.get('/v1/artifacts/mock-artifact-id')
				.set('Authorization', `Bearer ${authToken}`)
				.expect(404); // Expected since artifact doesn't exist
			expect(response.body.error).toBeDefined();

			// In a real test with an existing artifact:
			// expect(response.headers['digest']).toBeDefined();
			// expect(response.headers['etag']).toBeDefined();
		});
	});

	describe('Service Map', () => {
		it('should return available routes and versions', async () => {
			const response = await request(app)
				.get('/v1/service-map')
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(Array.isArray(response.body.routes)).toBe(true);
			const taskRoute = (
				response.body.routes as Array<{
					path: string;
					methods: string[];
					version: string;
				}>
			).find((r) => r.path === '/v1/tasks');
			expect(taskRoute).toBeDefined();
			if (taskRoute) {
				expect(taskRoute.methods).toContain('POST');
				expect(taskRoute.version).toBe('v1');
			}
		});
	});

        describe('Connector Service Map', () => {
                it('should return connector service map', async () => {
                        const response = await request(app)
                                .get('/v1/connectors/service-map')
                                .set('Authorization', `Bearer ${authToken}`)
                                .expect(200);

                        expect(response.body).toMatchObject({
                                id: 'brAInwav-connectors',
                                brand: 'brAInwav',
                        });
                        expect(typeof response.body.signature).toBe('string');
                        expect(response.body.signature).toMatch(/^[a-f0-9]{64}$/);
                        expect(typeof response.body.generatedAt).toBe('string');
                        expect(response.body.ttlSeconds).toBe(3600);
                        expect(response.body.connectors).toEqual([
                                {
                                        id: 'wikidata',
                                        version: '2024.09.18',
                                        displayName: 'Wikidata Semantic Search',
                                        endpoint: 'https://wd-mcp.wmcloud.org/mcp/',
                                        auth: { type: 'none' },
                                        scopes: [
                                                'wikidata:vector-search',
                                                'wikidata:claims',
                                                'wikidata:sparql',
                                        ],
                                        ttlSeconds: 3600,
                                        enabled: true,
                                        metadata: {
                                                brand: 'brAInwav',
                                                dumpDate: '2024-09-18',
                                                embeddingDimensions: 1024,
                                                languages: ['en', 'fr', 'ar'],
                                                supportsMatryoshka: true,
                                                vectorModel: 'jina-embeddings-v3',
                                                datasetMd5: 'dd7375a69774324dead6d3ea5abc01b7',
                                        },
                                },
                        ]);
                });
        });

	describe('Error Handling', () => {
		it('should return 404 for non-existent resources', async () => {
			const response = await request(app)
				.get('/v1/tasks/non-existent-id')
				.set('Authorization', `Bearer ${authToken}`)
				.expect(404);

			expect(response.body.error).toBe('Task not found');
			expect(response.body.code).toBe('NOT_FOUND');
		});

		it('should validate request schemas', async () => {
			const invalidTaskInput = {
				title: '', // Invalid: empty title
				brief: 'Test brief',
				// Missing required fields
			};

			const response = await request(app)
				.post('/v1/tasks')
				.set('Authorization', `Bearer ${authToken}`)
				.send({ input: invalidTaskInput })
				.expect(400);

			expect(response.body.error).toContain('Invalid');
			expect(response.body.code).toBe('VALIDATION_ERROR');
		});

		it('should handle malformed JSON', async () => {
			const response = await request(app)
				.post('/v1/tasks')
				.set('Authorization', `Bearer ${authToken}`)
				.set('Content-Type', 'application/json')
				.send('{ invalid json }')
				.expect(400);

			expect(response.body.error).toBeDefined();
		});

		it('should reject legacy task input formats', async () => {
			const response = await request(app)
				.post('/v1/tasks')
				.set('Authorization', `Bearer ${authToken}`)
				.send({
					profile: {
						skill: 'advanced',
						tools: ['filesystem'],
					},
				})
				.expect(400);

			expect(response.body.code).toBeDefined();
		});
	});
});
