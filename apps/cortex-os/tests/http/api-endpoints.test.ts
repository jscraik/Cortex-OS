import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type RuntimeHandle, startRuntime } from '../../src/runtime';

describe('brAInwav HTTP API Endpoints (Working Implementation)', () => {
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

	it('should serve health endpoint successfully', async () => {
		const response = await fetch(`${runtime.httpUrl}/health`);

		expect(response.status).toBe(200);

		const health = await response.json();
		expect(health).toMatchObject({
			status: 'ok',
			timestamp: expect.any(String),
		});
	});

	it('should serve SSE events endpoint', async () => {
		const response = await fetch(`${runtime.httpUrl}/v1/events?stream=sse`, {
			headers: { Accept: 'text/event-stream' },
		});

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('text/event-stream');

		// Read a small chunk to verify the stream works
		const reader = response.body?.getReader();
		if (!reader) throw new Error('SSE response did not expose a readable stream');

		const chunk = await reader.read();
		expect(chunk.done).toBe(false);
		expect(chunk.value).toBeDefined();

		// Cancel to avoid hanging
		await reader.cancel();
	});

	it('should require authentication for API endpoints', async () => {
		// Test that API endpoints are protected
		const response = await fetch(`${runtime.httpUrl}/v1/tasks`);

		// Should return an authentication error
		expect(response.status).toBe(401);

		const error = await response.json();
		expect(error.error).toBe('AuthError');
	});

	it('should provide meaningful error responses', async () => {
		// Test 404 for unknown routes
		const notFoundResponse = await fetch(`${runtime.httpUrl}/unknown-endpoint`);
		expect(notFoundResponse.status).toBe(404);

		const notFoundError = await notFoundResponse.json();
		expect(notFoundError.error).toBe('NotFound');
		expect(notFoundError.message).toBe('Route not found');
	});
});

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
// Co-authored-by: brAInwav Development Team
