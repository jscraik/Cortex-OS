import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type RuntimeHandle, startRuntime } from '../../src/runtime.js';
import { prepareLoopbackAuth } from '../setup.global.js';

let authHeader: string;

const withAuthHeaders = (headers: Record<string, string> = {}) => {
	if (!authHeader) {
		throw new Error('Loopback auth header not prepared for basic event tests');
	}
	return { Authorization: authHeader, ...headers };
};

describe('brAInwav Event System Basic Functionality', () => {
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
		// Clean up environment variables
		delete process.env.CORTEX_HTTP_PORT;
		delete process.env.CORTEX_MCP_MANAGER_PORT;
	});

	it('should emit events successfully', async () => {
		const testEvent = {
			type: 'test.basic.event',
			data: {
				message: 'Basic event test',
				timestamp: new Date().toISOString(),
			},
		};

		// Should emit without throwing
		await expect(runtime.events.emitEvent(testEvent)).resolves.toBeUndefined();
	});

	it('should work with SSE endpoint', async () => {
		const response = await fetch(`${runtime.httpUrl}/v1/events?stream=sse`, {
			headers: withAuthHeaders({ Accept: 'text/event-stream' }),
		});

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('text/event-stream');

		const reader = response.body?.getReader();
		if (!reader) throw new Error('SSE response did not expose a readable stream');

		// Read initial chunk (heartbeat)
		const chunk = await reader.read();
		expect(chunk.done).toBe(false);
		expect(chunk.value).toBeDefined();

		await reader.cancel();
	});

	it('should handle runtime events', async () => {
		const runtimeEvent = {
			type: 'runtime.test',
			data: {
				httpUrl: runtime.httpUrl,
				mcpUrl: runtime.mcpUrl,
				testData: 'runtime event test',
			},
		};

		await expect(runtime.events.emitEvent(runtimeEvent)).resolves.toBeUndefined();
	});

	it('should have functional event manager', () => {
		expect(runtime.events).toBeDefined();
		expect(typeof runtime.events.emitEvent).toBe('function');
	});
});

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
// Co-authored-by: brAInwav Development Team
