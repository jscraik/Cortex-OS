import { once } from 'node:events';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createEnhancedClient } from '../src/client.js';
import { EchoTool } from '../src/tools/echo-tool.js';
import { McpToolError, ToolRegistry } from '../src/tools.js';

describe('EchoTool integration', () => {
	const registry = new ToolRegistry();
	registry.register(new EchoTool());

	const server = createServer(async (req, res) => {
		if (req.method !== 'POST') {
			res.statusCode = 405;
			res.setHeader('Content-Type', 'application/json');
			res.end(
				JSON.stringify({ ok: false, error: { message: 'Method not allowed' } }),
			);
			return;
		}

		try {
			const chunks: Buffer[] = [];
			for await (const chunk of req) {
				chunks.push(Buffer.from(chunk));
			}
			const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
			const result = await registry.execute(payload.name, payload.arguments);
			res.statusCode = 200;
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ ok: true, result }));
		} catch (error) {
			if (error instanceof McpToolError) {
				res.statusCode = 400;
				res.setHeader('Content-Type', 'application/json');
				res.end(
					JSON.stringify({
						ok: false,
						error: {
							code: error.code,
							message: error.message,
							details: error.details ?? null,
						},
					}),
				);
				return;
			}
			res.statusCode = 500;
			res.setHeader('Content-Type', 'application/json');
			res.end(
				JSON.stringify({
					ok: false,
					error: {
						code: 'E_INTERNAL',
						message: (error as Error).message,
					},
				}),
			);
		}
	});

	let endpoint: string;

	beforeAll(async () => {
		server.listen(0, '127.0.0.1');
		await once(server, 'listening');
		const address = server.address() as AddressInfo;
		endpoint = `http://127.0.0.1:${address.port}`;
	});

	afterAll(async () => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	it('executes the echo tool via the MCP HTTP client', async () => {
		const client = await createEnhancedClient({
			name: 'echo-server',
			transport: 'http',
			endpoint,
		});

		try {
			const response = await client.callTool({
				name: 'echo',
				arguments: { message: 'hello', uppercase: true },
			});

			expect(response).toMatchObject({
				ok: true,
				result: {
					message: 'HELLO',
					original: {
						message: 'hello',
						uppercase: true,
					},
					timestamp: expect.any(String),
				},
			});
		} finally {
			await client.close();
		}
	});

	it('surfaces validation errors through the HTTP client', async () => {
		const client = await createEnhancedClient({
			name: 'echo-server',
			transport: 'http',
			endpoint,
			requestTimeoutMs: 2000,
		});

		try {
			await expect(
				client.callTool({
					name: 'echo',
					// number will fail validation
					arguments: { message: 123 },
				}),
			).rejects.toThrowError(/HTTP 400/);
		} finally {
			await client.close();
		}
	});
});
