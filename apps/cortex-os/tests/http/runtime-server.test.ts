import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type RuntimeHandle, startRuntime } from '../../src/runtime.js';
import { resetMetricsForTest } from '../../src/observability/metrics.js';
import { prepareLoopbackAuth } from '../setup.global.js';

let authHeader: string;

const withAuthHeaders = (headers: Record<string, string> = {}) => {
	if (!authHeader) {
		throw new Error('Loopback auth header not prepared for runtime HTTP tests');
	}
	return { Authorization: authHeader, ...headers };
};

describe('Runtime HTTP Server', () => {
	let runtime: RuntimeHandle;

	beforeAll(async () => {
		const { header } = await prepareLoopbackAuth();
		authHeader = header;
	});

	beforeEach(async () => {
		// Set test environment variables for random ports
		process.env.CORTEX_HTTP_PORT = '0';
		process.env.CORTEX_MCP_MANAGER_PORT = '0';

		runtime = await startRuntime();
	});

	afterEach(async () => {
		if (runtime) {
			await runtime.stop();
		}
		resetMetricsForTest();
		// Clean up environment variables
		delete process.env.CORTEX_HTTP_PORT;
		delete process.env.CORTEX_MCP_MANAGER_PORT;
	});

	it('should serve health check endpoint', async () => {
		const response = await fetch(`${runtime.httpUrl}/health`, {
			headers: withAuthHeaders(),
		});

		expect(response.status).toBe(200);

		const health = await response.json();
		expect(health).toMatchObject({
			status: 'healthy',
			service: {
				brand: 'brAInwav',
				name: expect.stringContaining('Cortex-OS'),
			},
			timestamp: expect.any(String),
		});

		// Verify timestamp is a valid ISO string
		expect(new Date(health.timestamp).toISOString()).toBe(health.timestamp);
		expect(health.components.tasks.status).toBe('healthy');
	});

	it('should serve task management endpoints', async () => {
		// POST /v1/tasks - Create task
		const createTaskPayload = {
			task: {
				id: 'test-task-http-001',
				status: 'pending',
				title: 'HTTP Test Task',
				description: 'Testing task creation via HTTP API',
				metadata: {
					created_via: 'http_test',
					priority: 'medium',
				},
			},
		};

		const createResponse = await fetch(`${runtime.httpUrl}/v1/tasks`, {
			method: 'POST',
			headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
			body: JSON.stringify(createTaskPayload),
		});

		expect(createResponse.status).toBe(201);
		const created = (await createResponse.json()) as {
			task: Record<string, unknown>;
			digest: string;
		};
		expect(created.task).toMatchObject({
			id: 'test-task-http-001',
			status: 'pending',
			title: 'HTTP Test Task',
			description: 'Testing task creation via HTTP API',
		});

		// GET /tasks/:id - Retrieve task
		const getResponse = await fetch(`${runtime.httpUrl}/v1/tasks/${created.task.id}`, {
			headers: withAuthHeaders(),
		});
		expect(getResponse.status).toBe(200);

		const retrieved = (await getResponse.json()) as {
			task: Record<string, unknown>;
			digest: string;
		};
		expect(retrieved.task).toMatchObject({
			id: 'test-task-http-001',
			title: 'HTTP Test Task',
			description: 'Testing task creation via HTTP API',
		});

		// PUT /tasks/:id - Update task
		const updatePayload = {
			status: 'in-progress',
			metadata: {
				...createTaskPayload.metadata,
				updated_via: 'http_test',
			},
		};

		const updateResponse = await fetch(`${runtime.httpUrl}/v1/tasks/${created.task.id}`, {
			method: 'PUT',
			headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
			body: JSON.stringify({ patch: updatePayload, expectedDigest: created.digest }),
		});

		expect(updateResponse.status).toBe(200);
		const updated = (await updateResponse.json()) as {
			task: Record<string, unknown>;
			digest: string;
		};
		expect(updated.task).toMatchObject({
			id: 'test-task-http-001',
			status: 'in-progress',
		});
		expect((updated.task as { metadata?: { updated_via?: string } }).metadata?.updated_via).toBe(
			'http_test',
		);

		// GET /tasks - List tasks
		const listResponse = await fetch(`${runtime.httpUrl}/v1/tasks`, {
			headers: withAuthHeaders(),
		});
		expect(listResponse.status).toBe(200);

		const tasksPayload = (await listResponse.json()) as {
			tasks: { record: Record<string, unknown> }[];
		};
		expect(Array.isArray(tasksPayload.tasks)).toBe(true);
		expect(
			tasksPayload.tasks.find((entry) => entry.record.id === 'test-task-http-001')?.record,
		).toBeDefined();

		// DELETE /tasks/:id - Delete task
		const deleteResponse = await fetch(`${runtime.httpUrl}/v1/tasks/${created.task.id}`, {
			method: 'DELETE',
			headers: withAuthHeaders(),
		});

		expect(deleteResponse.status).toBe(204);

		// Verify deletion
		const getDeletedResponse = await fetch(`${runtime.httpUrl}/v1/tasks/${created.task.id}`, {
			headers: withAuthHeaders(),
		});
		expect(getDeletedResponse.status).toBe(404);
	});

	it('should handle CORS for web UI integration', async () => {
		const response = await fetch(`${runtime.httpUrl}/health`, {
			method: 'OPTIONS',
			headers: withAuthHeaders({
				Origin: 'http://localhost:3000',
				'Access-Control-Request-Method': 'GET',
				'Access-Control-Request-Headers': 'Content-Type',
			}),
		});

		// Check CORS headers are present
		expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
		expect(response.headers.get('Access-Control-Allow-Methods')).toBeTruthy();
		expect(response.headers.get('Access-Control-Allow-Headers')).toBeTruthy();
	});

	it('should serve profile management endpoints', async () => {
		// POST /profiles - Create profile
		const profilePayload = {
			id: 'test-profile-http-001',
			label: 'HTTP Test Profile',
			scopes: ['read', 'write'],
			metadata: {
				created_via: 'http_test',
				description: 'Profile for HTTP testing',
			},
		};

		const createResponse = await fetch(`${runtime.httpUrl}/v1/profiles`, {
			method: 'POST',
			headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
			body: JSON.stringify({ profile: profilePayload }),
		});

		expect(createResponse.status).toBe(201);
		const created = (await createResponse.json()) as {
			profile: Record<string, unknown>;
			digest: string;
		};
		expect(created.profile).toMatchObject({
			id: 'test-profile-http-001',
			label: 'HTTP Test Profile',
			scopes: ['read', 'write'],
		});

		// GET /profiles/:id - Retrieve profile
		const getResponse = await fetch(`${runtime.httpUrl}/v1/profiles/${created.profile.id}`, {
			headers: withAuthHeaders(),
		});
		expect(getResponse.status).toBe(200);

		const retrieved = (await getResponse.json()) as {
			profile: Record<string, unknown>;
			digest: string;
		};
		expect(retrieved.profile.label).toBe('HTTP Test Profile');

		// Cleanup
		await fetch(`${runtime.httpUrl}/v1/profiles/${created.profile.id}`, {
			method: 'DELETE',
			headers: withAuthHeaders(),
		});
	});

	it('should handle error cases gracefully', async () => {
		// GET non-existent task
		const notFoundResponse = await fetch(`${runtime.httpUrl}/v1/tasks/non-existent-task`, {
			headers: withAuthHeaders(),
		});
		expect(notFoundResponse.status).toBe(404);

		// POST with invalid JSON
		const invalidJsonResponse = await fetch(`${runtime.httpUrl}/v1/tasks`, {
			method: 'POST',
			headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
			body: 'invalid json content',
		});
		expect(invalidJsonResponse.status).toBe(400);

		// POST with missing required fields
		const missingIdResponse = await fetch(`${runtime.httpUrl}/v1/tasks`, {
			method: 'POST',
			headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
			body: JSON.stringify({ task: { status: 'pending', title: 'Missing ID' } }),
		});
		expect(missingIdResponse.status).toBe(400);
	});

	it('should serve artifact management endpoints', async () => {
		// POST /artifacts - Upload artifact
		const artifactData = Buffer.from('Test artifact content');
		const artifactPayload = {
			artifact: {
				id: 'test-artifact-http-001',
				filename: 'test-file.txt',
				contentType: 'text/plain',
				base64Payload: artifactData.toString('base64'),
				taskId: 'related-task-001',
				tags: ['log'],
			},
		};

		const uploadResponse = await fetch(`${runtime.httpUrl}/v1/artifacts`, {
			method: 'POST',
			headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
			body: JSON.stringify(artifactPayload),
		});

		expect(uploadResponse.status).toBe(201);
		const uploadedArtifact = (await uploadResponse.json()) as {
			metadata: { id: string; filename: string };
			digest: string;
		};
		expect(uploadedArtifact.metadata.id).toBe('test-artifact-http-001');
		expect(uploadedArtifact.metadata.filename).toBe('test-file.txt');

		// GET /artifacts/:id - Download artifact
		const downloadResponse = await fetch(
			`${runtime.httpUrl}/v1/artifacts/${uploadedArtifact.metadata.id}`,
			{
				headers: withAuthHeaders(),
			},
		);
		expect(downloadResponse.status).toBe(200);

		const downloaded = (await downloadResponse.json()) as {
			metadata: { filename: string };
			base64Payload: string;
		};
		expect(downloaded.metadata.filename).toBe('test-file.txt');
		expect(Buffer.from(downloaded.base64Payload, 'base64').toString()).toBe(
			'Test artifact content',
		);

		// GET /artifacts - List artifacts
		const listResponse = await fetch(`${runtime.httpUrl}/v1/artifacts?taskId=related-task-001`, {
			headers: withAuthHeaders(),
		});
		expect(listResponse.status).toBe(200);

		const artifactsPayload = (await listResponse.json()) as {
			artifacts: {
				id: string;
				filename: string;
				contentType: string;
			}[];
		};
		expect(Array.isArray(artifactsPayload.artifacts)).toBe(true);
		expect(artifactsPayload.artifacts.find((a) => a.id === 'test-artifact-http-001')).toBeDefined();

		// Cleanup
		await fetch(`${runtime.httpUrl}/v1/artifacts/${uploadedArtifact.metadata.id}`, {
			method: 'DELETE',
			headers: withAuthHeaders(),
		});
	});

	it('should serve evidence management endpoints', async () => {
		// POST /evidence - Create evidence
		const evidencePayload = {
			id: 'test-evidence-http-001',
			taskId: 'related-task-002',
			type: 'test-result',
			timestamp: new Date().toISOString(),
			payload: {
				testName: 'HTTP Integration Test',
				result: 'PASS',
				duration: 150,
				assertions: 5,
			},
			tags: ['http-test', 'integration'],
		};

		const createResponse = await fetch(`${runtime.httpUrl}/v1/evidence`, {
			method: 'POST',
			headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
			body: JSON.stringify({ evidence: evidencePayload }),
		});

		expect(createResponse.status).toBe(201);
		const created = (await createResponse.json()) as {
			evidence: Record<string, unknown>;
			digest: string;
		};
		expect(created.evidence).toMatchObject({
			id: 'test-evidence-http-001',
			type: 'test-result',
		});

		// GET /evidence/:id - Retrieve evidence
		const getResponse = await fetch(`${runtime.httpUrl}/v1/evidence/${created.evidence.id}`, {
			headers: withAuthHeaders(),
		});
		expect(getResponse.status).toBe(200);

		const retrieved = (await getResponse.json()) as {
			evidence: { payload: { testName: string } };
			digest: string;
		};
		expect(retrieved.evidence.payload.testName).toBe('HTTP Integration Test');

		// GET /evidence - List evidence
		const listResponse = await fetch(`${runtime.httpUrl}/v1/evidence?taskId=related-task-002`, {
			headers: withAuthHeaders(),
		});
		expect(listResponse.status).toBe(200);

		const evidenceList = (await listResponse.json()) as {
			evidence: { record: { id: string } }[];
		};
		expect(Array.isArray(evidenceList.evidence)).toBe(true);
		expect(
			evidenceList.evidence.find((entry) => entry.record.id === 'test-evidence-http-001'),
		).toBeDefined();

		// Cleanup
		await fetch(`${runtime.httpUrl}/v1/evidence/${created.evidence.id}`, {
			method: 'DELETE',
			headers: withAuthHeaders(),
		});
	});

	it('should provide observability endpoints', async () => {
		// GET /metrics - Prometheus metrics
		const metricsResponse = await fetch(`${runtime.httpUrl}/metrics`, {
			headers: withAuthHeaders(),
		});
		expect(metricsResponse.status).toBe(200);
		expect(metricsResponse.headers.get('content-type')).toContain('text/plain');

		const metrics = await metricsResponse.text();
		expect(typeof metrics).toBe('string');
		expect(metrics.length).toBeGreaterThan(0);

		// Basic check for expected metric patterns
		expect(metrics).toMatch(/cortex_/); // Should contain cortex-prefixed metrics

		// GET /v1/events - Server-sent events endpoint
		const eventsResponse = await fetch(`${runtime.httpUrl}/v1/events?stream=sse`, {
			headers: withAuthHeaders({ Accept: 'text/event-stream' }),
		});

		expect(eventsResponse.status).toBe(200);
		expect(eventsResponse.headers.get('content-type')).toContain('text/event-stream');

		// Read a small chunk to verify the stream works
		const reader = eventsResponse.body?.getReader();
		if (!reader) throw new Error('SSE response did not expose a readable stream');

		const chunk = await reader.read();
		expect(chunk.done).toBe(false);
		expect(chunk.value).toBeDefined();

		// Cancel to avoid hanging
		await reader.cancel();
	});
});
