import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMcpHttpServer } from '../../src/mcp/server.js';
import type { McpGateway } from '../../src/mcp/gateway.js';

interface Deferred<T = void> {
	promise: Promise<T>;
	resolve: (value: T | PromiseLike<T>) => void;
	reject: (reason?: unknown) => void;
}

function createDeferred<T = void>(): Deferred<T> {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

describe('MCP HTTP server graceful shutdown', () => {
	let server: ReturnType<typeof createMcpHttpServer> | undefined;

	afterEach(async () => {
		if (server) {
			await server.beginShutdown({ timeoutMs: 0 }).catch(() => undefined);
		}
		server = undefined;
	});

	it('drains in-flight tool calls and rejects new requests', async () => {
		const inFlight = createDeferred<void>();
		const release = createDeferred<void>();

		const gateway = {
			listTools: vi.fn(() => [{ name: 'slow.tool', description: 'Slow tool for shutdown tests' }]),
			callTool: vi.fn(async () => {
				inFlight.resolve();
				await release.promise;
				return {
					tool: 'slow.tool',
					metadata: { brand: 'brAInwav', resultSource: 'direct' },
					content: [{ type: 'text', text: 'completed' }],
				};
			}),
		} as unknown as McpGateway;

		server = createMcpHttpServer(gateway);
		const { port } = await server.listen(0);
		const baseUrl = `http://127.0.0.1:${port}`;

		const slowResponsePromise = fetch(`${baseUrl}/tools/call`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'slow.tool', arguments: {} }),
		});

		await inFlight.promise;

		const shutdownPromise = server.beginShutdown({ timeoutMs: 1_000 });

		const blocked = await fetch(`${baseUrl}/tools`);
		expect(blocked.status).toBe(503);
		const blockedBody = (await blocked.json()) as { status: string; message: string };
		expect(blockedBody.status).toBe('unavailable');
		expect(blockedBody.message).toContain('brAInwav');

		release.resolve();

		const slowResponse = await slowResponsePromise;
		expect(slowResponse.status).toBe(200);

		const shutdownResult = await shutdownPromise;
		expect(shutdownResult.completed).toBe(true);
		expect(shutdownResult.pendingRequests).toBe(0);
		expect(gateway.callTool).toHaveBeenCalledTimes(1);
	});
});
