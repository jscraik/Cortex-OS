import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { StdioHttpBridge } from '../src/stdio-http.js';

interface MCPRequest {
	jsonrpc?: string;
	id: string | number;
	method: string;
	params?: Record<string, unknown>;
}

describe('MCP Bridge Integration', () => {
	it('integrates with mcp-core compatible endpoints', async () => {
		// Create a mock MCP server that mcp-core would create
		const server = http.createServer((req, res) => {
			let body = '';
			req.on('data', (chunk) => {
				body += chunk;
			});
			req.on('end', () => {
				try {
					const request = JSON.parse(body);
					const response = {
						id: request.id || 'test-id',
						result: {
							tool: request.params?.name || 'unknown',
							args: request.params?.arguments || {},
							timestamp: new Date().toISOString(),
						},
					};
					res.setHeader('Content-Type', 'application/json');
					res.end(JSON.stringify(response));
				} catch {
					res.statusCode = 400;
					res.end(JSON.stringify({ error: 'Invalid JSON' }));
				}
			});
		});

		await new Promise<void>((resolve) => server.listen(0, resolve));
		const port = (server.address() as AddressInfo).port;
		const endpoint = `http://127.0.0.1:${port}`;

		try {
			// Create bridge that would connect stdio to the mcp-core compatible endpoint
			const bridge = new StdioHttpBridge({
				httpEndpoint: endpoint,
				enableRateLimiting: false,
			});

			// Test the bridge can forward requests to mcp-core compatible endpoints
			const request: MCPRequest = {
				jsonrpc: '2.0',
				id: 'integration-test',
				method: 'tools/call',
				params: {
					name: 'test-tool',
					arguments: { param1: 'value1', param2: 42 },
				},
			};
			const response = await bridge.forward(request);

			expect(response).toMatchObject({
				id: 'integration-test',
				result: {
					tool: 'test-tool',
					args: { param1: 'value1', param2: 42 },
					timestamp: expect.any(String),
				},
			});

			await bridge.close();
		} finally {
			server.close();
		}
	});

	it('works with registry-style server configurations', async () => {
		// Test that bridge can work with server configs that come from mcp-registry
		// Create a mock server that accepts any request without header validation
		const server = http.createServer((_req, res) => {
			res.setHeader('Content-Type', 'application/json');
			res.end(
				JSON.stringify({
					id: 'registry-test',
					result: { status: 'ok', config: 'registry-compatible' },
				}),
			);
		});

		await new Promise<void>((resolve) => server.listen(0, resolve));
		const port = (server.address() as AddressInfo).port;

		try {
			const bridge = new StdioHttpBridge({
				httpEndpoint: `http://127.0.0.1:${port}`,
				enableRateLimiting: false,
			});

			const request: MCPRequest = {
				jsonrpc: '2.0',
				id: 'registry-test',
				method: 'test',
				params: {},
			};
			const response = await bridge.forward(request);

			expect(response).toMatchObject({
				id: 'registry-test',
				result: { status: 'ok', config: 'registry-compatible' },
			});

			await bridge.close();
		} finally {
			server.close();
		}
	});

	it('provides fault tolerance for cross-package scenarios', async () => {
		// Test circuit breaker and retry logic for cross-package integration
		let requestCount = 0;
		const server = http.createServer((_req, res) => {
			requestCount++;
			if (requestCount <= 2) {
				// Fail first 2 requests to test retry logic
				res.statusCode = 500;
				res.end('Server Error');
			} else {
				// Succeed on 3rd request
				res.setHeader('Content-Type', 'application/json');
				res.end(
					JSON.stringify({
						id: 'retry-test',
						result: { success: true, attempts: requestCount },
					}),
				);
			}
		});

		await new Promise<void>((resolve) => server.listen(0, resolve));
		const port = (server.address() as AddressInfo).port;

		try {
			const bridge = new StdioHttpBridge({
				httpEndpoint: `http://127.0.0.1:${port}`,
				retryOptions: {
					maxRetries: 3,
					retryDelay: 100,
					maxDelay: 500,
				},
				enableRateLimiting: false,
			});

			const request: MCPRequest = {
				jsonrpc: '2.0',
				id: 'retry-test',
				method: 'test-retry',
				params: {},
			};
			const response = await bridge.forward(request);

			expect(response).toMatchObject({
				id: 'retry-test',
				result: {
					success: true,
					attempts: 3,
				},
			});
			expect(requestCount).toBe(3);

			await bridge.close();
		} finally {
			server.close();
		}
	});
});
