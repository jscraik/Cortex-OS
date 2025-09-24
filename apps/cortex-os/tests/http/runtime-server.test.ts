import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type RuntimeHandle, startRuntime } from '../../src/runtime.js';

describe('Runtime HTTP Server', () => {
	let runtime: RuntimeHandle;

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
		// Clean up environment variables
		delete process.env.CORTEX_HTTP_PORT;
		delete process.env.CORTEX_MCP_MANAGER_PORT;
	});

	it('should serve health check endpoint', async () => {
		const response = await fetch(`${runtime.httpUrl}/health`);

		expect(response.status).toBe(200);

		const health = await response.json();
		expect(health).toMatchObject({
			status: 'ok',
			timestamp: expect.any(String),
		});

		// Verify timestamp is a valid ISO string
		expect(new Date(health.timestamp).toISOString()).toBe(health.timestamp);
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
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(createTaskPayload),
		});

		expect(createResponse.status).toBe(201);
		const created = await createResponse.json();
		expect(created.id).toBe('test-task-http-001');
		expect(created.status).toBe('pending');
		expect(created.title).toBe('HTTP Test Task');

		// GET /tasks/:id - Retrieve task
		const getResponse = await fetch(`${runtime.httpUrl}/tasks/${created.id}`);
		expect(getResponse.status).toBe(200);

		const retrieved = await getResponse.json();
		expect(retrieved.id).toBe('test-task-http-001');
		expect(retrieved.title).toBe('HTTP Test Task');
		expect(retrieved.description).toBe('Testing task creation via HTTP API');

		// PUT /tasks/:id - Update task
		const updatePayload = {
			status: 'in-progress',
			metadata: {
				...createTaskPayload.metadata,
				updated_via: 'http_test',
			},
		};

		const updateResponse = await fetch(`${runtime.httpUrl}/tasks/${created.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(updatePayload),
		});

		expect(updateResponse.status).toBe(200);
		const updated = await updateResponse.json();
		expect(updated.status).toBe('in-progress');
		expect(updated.metadata.updated_via).toBe('http_test');

		// GET /tasks - List tasks
		const listResponse = await fetch(`${runtime.httpUrl}/tasks`);
		expect(listResponse.status).toBe(200);

		const tasks = await listResponse.json();
		expect(Array.isArray(tasks)).toBe(true);
		expect(tasks.find((t: any) => t.id === 'test-task-http-001')).toBeDefined();

		// DELETE /tasks/:id - Delete task
		const deleteResponse = await fetch(`${runtime.httpUrl}/tasks/${created.id}`, {
			method: 'DELETE',
		});

		expect(deleteResponse.status).toBe(204);

		// Verify deletion
		const getDeletedResponse = await fetch(`${runtime.httpUrl}/tasks/${created.id}`);
		expect(getDeletedResponse.status).toBe(404);
	});

	it('should handle CORS for web UI integration', async () => {
		const response = await fetch(`${runtime.httpUrl}/health`, {
			method: 'OPTIONS',
			headers: {
				Origin: 'http://localhost:3000',
				'Access-Control-Request-Method': 'GET',
				'Access-Control-Request-Headers': 'Content-Type',
			},
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

		const createResponse = await fetch(`${runtime.httpUrl}/profiles`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(profilePayload),
		});

		expect(createResponse.status).toBe(201);
		const created = await createResponse.json();
		expect(created.id).toBe('test-profile-http-001');
		expect(created.scopes).toEqual(['read', 'write']);

		// GET /profiles/:id - Retrieve profile
		const getResponse = await fetch(`${runtime.httpUrl}/profiles/${created.id}`);
		expect(getResponse.status).toBe(200);

		const retrieved = await getResponse.json();
		expect(retrieved.label).toBe('HTTP Test Profile');

		// Cleanup
		await fetch(`${runtime.httpUrl}/profiles/${created.id}`, { method: 'DELETE' });
	});

	it('should handle error cases gracefully', async () => {
		// GET non-existent task
		const notFoundResponse = await fetch(`${runtime.httpUrl}/tasks/non-existent-task`);
		expect(notFoundResponse.status).toBe(404);

		// POST with invalid JSON
		const invalidJsonResponse = await fetch(`${runtime.httpUrl}/tasks`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: 'invalid json content',
		});
		expect(invalidJsonResponse.status).toBe(400);

		// POST with missing required fields
		const invalidTaskResponse = await fetch(`${runtime.httpUrl}/tasks`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: 'Missing ID' }), // Missing id field
		});
		expect(invalidTaskResponse.status).toBe(400);
	});

	it('should serve artifact management endpoints', async () => {
		// POST /artifacts - Upload artifact
		const artifactData = Buffer.from('Test artifact content');
		const formData = new FormData();
		formData.append('id', 'test-artifact-http-001');
		formData.append('filename', 'test-file.txt');
		formData.append('contentType', 'text/plain');
		formData.append('taskId', 'related-task-001');
		formData.append('file', new Blob([artifactData]), 'test-file.txt');

		const uploadResponse = await fetch(`${runtime.httpUrl}/artifacts`, {
			method: 'POST',
			body: formData,
		});

		expect(uploadResponse.status).toBe(201);
		const uploadedArtifact = await uploadResponse.json();
		expect(uploadedArtifact.id).toBe('test-artifact-http-001');
		expect(uploadedArtifact.filename).toBe('test-file.txt');

		// GET /artifacts/:id - Download artifact
		const downloadResponse = await fetch(`${runtime.httpUrl}/artifacts/${uploadedArtifact.id}`);
		expect(downloadResponse.status).toBe(200);
		expect(downloadResponse.headers.get('content-type')).toBe('text/plain');

		const downloadedContent = await downloadResponse.text();
		expect(downloadedContent).toBe('Test artifact content');

		// GET /artifacts - List artifacts
		const listResponse = await fetch(`${runtime.httpUrl}/artifacts?taskId=related-task-001`);
		expect(listResponse.status).toBe(200);

		const artifacts = await listResponse.json();
		expect(Array.isArray(artifacts)).toBe(true);
		expect(artifacts.find((a: any) => a.id === 'test-artifact-http-001')).toBeDefined();

		// Cleanup
		await fetch(`${runtime.httpUrl}/artifacts/${uploadedArtifact.id}`, { method: 'DELETE' });
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

		const createResponse = await fetch(`${runtime.httpUrl}/evidence`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(evidencePayload),
		});

		expect(createResponse.status).toBe(201);
		const created = await createResponse.json();
		expect(created.id).toBe('test-evidence-http-001');
		expect(created.type).toBe('test-result');

		// GET /evidence/:id - Retrieve evidence
		const getResponse = await fetch(`${runtime.httpUrl}/evidence/${created.id}`);
		expect(getResponse.status).toBe(200);

		const retrieved = await getResponse.json();
		expect(retrieved.payload.testName).toBe('HTTP Integration Test');

		// GET /evidence - List evidence
		const listResponse = await fetch(`${runtime.httpUrl}/evidence?taskId=related-task-002`);
		expect(listResponse.status).toBe(200);

		const evidenceList = await listResponse.json();
		expect(Array.isArray(evidenceList)).toBe(true);
		expect(evidenceList.find((e: any) => e.id === 'test-evidence-http-001')).toBeDefined();

		// Cleanup
		await fetch(`${runtime.httpUrl}/evidence/${created.id}`, { method: 'DELETE' });
	});

	it('should provide observability endpoints', async () => {
		// GET /metrics - Prometheus metrics
		const metricsResponse = await fetch(`${runtime.httpUrl}/metrics`);
		expect(metricsResponse.status).toBe(200);
		expect(metricsResponse.headers.get('content-type')).toContain('text/plain');

		const metrics = await metricsResponse.text();
		expect(typeof metrics).toBe('string');
		expect(metrics.length).toBeGreaterThan(0);

		// Basic check for expected metric patterns
		expect(metrics).toMatch(/cortex_/); // Should contain cortex-prefixed metrics

		// GET /v1/events - Server-sent events endpoint
		const eventsResponse = await fetch(`${runtime.httpUrl}/v1/events?stream=sse`, {
			headers: { Accept: 'text/event-stream' },
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
