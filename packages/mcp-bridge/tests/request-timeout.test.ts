import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { StdioHttpBridge, TimeoutError } from '../src/stdio-http.js';

describe('StdioHttpBridge requestTimeoutMs', () => {
	it('completes normally under generous timeout', async () => {
		const server = http.createServer((req, res) => {
			let body = '';
			req.on('data', (c) => {
				body += c;
			});
			req.on('end', () => {
				const payload = JSON.parse(body);
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify({ id: payload.id, result: 'ok' }));
			});
		});
		await new Promise<void>((r) => server.listen(0, r));
		const port = (server.address() as AddressInfo).port;
		const bridge = new StdioHttpBridge({
			httpEndpoint: `http://localhost:${port}`,
			requestTimeoutMs: 1000,
		});
		const res = await bridge.forward({ id: '1', method: 'm', params: {} });
		expect(res).toMatchObject({ result: 'ok' });
		await bridge.close();
		server.close();
	});

	it('times out slow HTTP request', async () => {
		const server = http.createServer((_req, res) => {
			setTimeout(() => {
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify({ id: '1', result: 'late' }));
			}, 150); // exceed timeout
		});
		await new Promise<void>((r) => server.listen(0, r));
		const port = (server.address() as AddressInfo).port;
		const bridge = new StdioHttpBridge({
			httpEndpoint: `http://localhost:${port}`,
			requestTimeoutMs: 50,
			retryOptions: { maxRetries: 0, retryDelay: 1 },
		});
		await expect(
			bridge.forward({ id: '1', method: 'm', params: {} }),
		).rejects.toBeInstanceOf(TimeoutError);
		await bridge.close();
		server.close();
	});

	it('times out SSE connection attempt', async () => {
		const sseServer = http.createServer((_req, _res) => {
			// Intentionally delay sending headers beyond timeout
			setTimeout(() => {
				// If timeout fails, we eventually respond (should not happen in passing test)
			}, 200);
		});
		await new Promise<void>((r) => sseServer.listen(0, r));
		const ssePort = (sseServer.address() as AddressInfo).port;
		const bridge = new StdioHttpBridge({
			httpEndpoint: `http://127.0.0.1:${ssePort}`,
			transport: 'sse',
			requestTimeoutMs: 40,
		});
		await expect(bridge.connect()).rejects.toBeInstanceOf(TimeoutError);
		await bridge.close();
		sseServer.close();
	});
});
