import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { startRuntime } from '../src/runtime.js';

interface RunningRuntime {
	httpUrl: string;
	mcpUrl: string;
	stop: () => Promise<void>;
	events: {
		emitEvent: (event: { type: string; data: Record<string, unknown> }) => Promise<void>;
	};
}

describe('runtime bootstrap (integration)', () => {
	let runtime: RunningRuntime;

	beforeAll(async () => {
		process.env.CORTEX_HTTP_PORT = '0';
		process.env.CORTEX_MCP_MANAGER_PORT = '0';

		runtime = (await startRuntime()) as unknown as RunningRuntime;
	});

	afterAll(async () => {
		await runtime.stop();
		delete process.env.CORTEX_HTTP_PORT;
		delete process.env.CORTEX_MCP_MANAGER_PORT;
	});

	test('exposes a health endpoint', async () => {
		const res = await fetch(`${runtime.httpUrl}/health`);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toMatchObject({ status: 'ok' });
		expect(typeof body.timestamp).toBe('string');
	});

	test('exposes MCP tool discovery endpoint', async () => {
		const res = await fetch(`${runtime.mcpUrl}/tools`);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(Array.isArray(body.tools)).toBe(true);
	});

	test('streams runtime events over SSE', async () => {
		const response = await fetch(`${runtime.httpUrl}/v1/events?stream=sse`, {
			headers: { Accept: 'text/event-stream' },
		});

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('text/event-stream');

		// Read a single chunk to confirm the stream is active, then cancel to avoid hanging tests.
		const reader = response.body?.getReader();
		if (!reader) throw new Error('SSE response did not expose a readable stream');
		await reader.read();
		await reader.cancel();
	});
});
