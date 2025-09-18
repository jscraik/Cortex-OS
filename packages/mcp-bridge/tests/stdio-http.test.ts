import { EventEmitter } from 'node:events';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ServerInfo } from '@cortex-os/mcp-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StdioHttpBridge } from '../src/stdio-http.js';

describe('StdioHttpBridge', () => {
	let bridge: StdioHttpBridge;
	let httpServer: http.Server;
	let serverPort: number;

	beforeEach(async () => {
		// Create a mock HTTP server for testing
		httpServer = http.createServer((req, res) => {
			let body = '';
			req.on('data', (chunk) => {
				body += chunk;
			});
			req.on('end', () => {
				const payload = JSON.parse(body);
				res.setHeader('Content-Type', 'application/json');

				// Echo back with a test response
				res.end(
					JSON.stringify({
						id: payload.id,
						result: { echo: payload.method, params: payload.params },
					}),
				);
			});
		});

		await new Promise<void>((resolve) => {
			httpServer.listen(0, () => {
				serverPort = (httpServer.address() as AddressInfo).port;
				resolve();
			});
		});
	});

	afterEach(async () => {
		if (bridge) {
			await bridge.close();
		}
		if (httpServer) {
			httpServer.close();
		}
	});

	describe('stdio to HTTP bridging', () => {
		it('bridges stdio commands to HTTP endpoints', async () => {
			const _serverInfo: ServerInfo = {
				name: 'test-server',
				transport: 'stdio',
				command: 'echo',
				args: ['test'],
			};

			bridge = new StdioHttpBridge({
				httpEndpoint: `http://localhost:${serverPort}`,
				enableRateLimiting: false,
			});

			const result = await bridge.forward({
				id: '1',
				method: 'test.method',
				params: { key: 'value' },
			});

			expect(result).toEqual({
				id: '1',
				result: {
					echo: 'test.method',
					params: { key: 'value' },
				},
			});
		});

		it('handles SSE transport', async () => {
			// Create SSE server
			const sseServer = http.createServer((_req, res) => {
				res.writeHead(200, {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
				});

				// Send test event
				res.write('data: {"test": "event"}\n\n');

				setTimeout(() => {
					res.write('data: {"done": true}\n\n');
					res.end();
				}, 100);
			});

			await new Promise<void>((resolve) => {
				sseServer.listen(0, resolve);
			});

			const ssePort = (sseServer.address() as AddressInfo).port;

			const sseBridge = new StdioHttpBridge({
				httpEndpoint: `http://localhost:${ssePort}`,
				transport: 'sse',
				enableRateLimiting: false,
			});

			const events: any[] = [];
			sseBridge.on('event', (data) => {
				events.push(data);
			});

			await sseBridge.connect();

			// Wait for events
			await new Promise((resolve) => setTimeout(resolve, 200));

			expect(events).toHaveLength(2);
			expect(events[0]).toEqual({ test: 'event' });
			expect(events[1]).toEqual({ done: true });

			await sseBridge.close();
			sseServer.close();
		});

		it('applies rate limiting when enabled', async () => {
			bridge = new StdioHttpBridge({
				httpEndpoint: `http://localhost:${serverPort}`,
				enableRateLimiting: true,
				rateLimitOptions: {
					maxRequests: 2,
					windowMs: 1000,
				},
			});

			// First two requests should succeed
			await bridge.forward({ id: '1', method: 'test', params: {} });
			await bridge.forward({ id: '2', method: 'test', params: {} });

			// Third request should be rate limited
			await expect(bridge.forward({ id: '3', method: 'test', params: {} })).rejects.toThrow(
				'Rate limit exceeded',
			);
		});

		it('handles connection errors gracefully', async () => {
			bridge = new StdioHttpBridge({
				httpEndpoint: 'http://localhost:99999', // Invalid port
				enableRateLimiting: false,
			});

			await expect(bridge.forward({ id: '1', method: 'test', params: {} })).rejects.toThrow();
		});

		it('supports bidirectional communication', async () => {
			const mockStdio = new EventEmitter();
			const stdinData: any[] = [];

			// Mock stdin/stdout
			const mockStdin = {
				on: vi.fn((event, handler) => {
					if (event === 'data') {
						mockStdio.on('stdin', handler);
					}
				}),
			};

			const mockStdout = {
				write: vi.fn((data) => {
					stdinData.push(JSON.parse(data));
				}),
			};

			bridge = new StdioHttpBridge({
				httpEndpoint: `http://localhost:${serverPort}`,
				stdin: mockStdin as any,
				stdout: mockStdout as any,
				enableRateLimiting: false,
			});

			await bridge.start();

			// Simulate stdin input
			mockStdio.emit(
				'stdin',
				`${JSON.stringify({
					id: '1',
					method: 'test',
					params: { foo: 'bar' },
				})}\n`,
			);

			// Wait for processing
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(mockStdout.write).toHaveBeenCalled();
			expect(stdinData[0]).toMatchObject({
				id: '1',
				result: expect.any(Object),
			});
		});
	});

	describe('error recovery', () => {
		it('retries failed requests with exponential backoff', async () => {
			let attempts = 0;
			const retryServer = http.createServer((_req, res) => {
				attempts++;
				if (attempts < 3) {
					res.statusCode = 503;
					res.end('Service Unavailable');
				} else {
					res.setHeader('Content-Type', 'application/json');
					res.end(JSON.stringify({ id: '1', result: 'success' }));
				}
			});

			await new Promise<void>((resolve) => {
				retryServer.listen(0, resolve);
			});

			const retryPort = (retryServer.address() as AddressInfo).port;

			bridge = new StdioHttpBridge({
				httpEndpoint: `http://localhost:${retryPort}`,
				enableRateLimiting: false,
				retryOptions: {
					maxRetries: 3,
					retryDelay: 10,
				},
			});

			const result = await bridge.forward({
				id: '1',
				method: 'test',
				params: {},
			});

			expect(attempts).toBe(3);
			expect(result).toMatchObject({ result: 'success' });

			retryServer.close();
		});

		it('handles circuit breaker activation', async () => {
			const failingServer = http.createServer((_req, res) => {
				res.statusCode = 500;
				res.end('Internal Server Error');
			});

			await new Promise<void>((resolve) => {
				failingServer.listen(0, resolve);
			});

			const failPort = (failingServer.address() as AddressInfo).port;

			bridge = new StdioHttpBridge({
				httpEndpoint: `http://localhost:${failPort}`,
				enableRateLimiting: false,
				circuitBreakerOptions: {
					failureThreshold: 2,
					resetTimeout: 100,
				},
			});

			// Trigger circuit breaker
			await expect(bridge.forward({ id: '1', method: 'test', params: {} })).rejects.toThrow();
			await expect(bridge.forward({ id: '2', method: 'test', params: {} })).rejects.toThrow();

			// Circuit should be open now
			await expect(bridge.forward({ id: '3', method: 'test', params: {} })).rejects.toThrow(
				'Circuit breaker is open',
			);

			failingServer.close();
		});
	});
});
