import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { createEnhancedClient } from '../src/client.js';

describe('createEnhancedClient', () => {
	it('makes HTTP tool calls', async () => {
		const server = http.createServer((req, res) => {
			let body = '';
			req.on('data', (chunk) => {
				body += chunk;
			});
			req.on('end', () => {
				const payload = JSON.parse(body);
				res.setHeader('Content-Type', 'application/json');
				res.end(
					JSON.stringify({ echo: payload.name, args: payload.arguments }),
				);
			});
		});
		await new Promise((resolve) => server.listen(0, resolve));
		const port = (server.address() as AddressInfo).port;

		const client = await createEnhancedClient({
			name: 'http-test',
			transport: 'streamableHttp',
			endpoint: `http://127.0.0.1:${port}`,
		});

		const result = await client.callTool({ name: 'tool', arguments: { a: 1 } });
		expect(result).toEqual({ echo: 'tool', args: { a: 1 } });

		await client.close();
		server.close();
	});

	it('supports stdio transport', async () => {
		const client = await createEnhancedClient({
			name: 'stdio-test',
			transport: 'stdio',
			command: process.execPath,
			args: [
				'-e',
				`process.stdin.on('data',d=>{const r=JSON.parse(d.toString());process.stdout.write(JSON.stringify({ok:r.name})+'\\n');});`,
			],
		});

		const res = await client.callTool({ name: 'ping' });
		expect(res).toEqual({ ok: 'ping' });
		await client.close();
	});

	it('validates server info', async () => {
		await expect(
			createEnhancedClient({
				name: 'bad',
				transport: 'stdio',
			} as any),
		).rejects.toThrow();
	});

	it('throws error for HTTP transport without endpoint', async () => {
		await expect(
			createEnhancedClient({
				name: 'test',
				transport: 'streamableHttp',
			}),
		).rejects.toThrow('endpoint required for http transports');
	});

	it('throws error for stdio transport without command', async () => {
		await expect(
			createEnhancedClient({
				name: 'test',
				transport: 'stdio',
			}),
		).rejects.toThrow('command required for stdio transport');
	});

	it('throws error for unsupported transport', async () => {
		await expect(
			createEnhancedClient({
				name: 'test',
				transport: 'unsupported' as 'stdio',
			}),
		).rejects.toThrow(/Invalid enum value.*unsupported/);
	});

	it('throws error for sse transport without endpoint', async () => {
		await expect(
			createEnhancedClient({
				name: 'test',
				transport: 'sse',
			}),
		).rejects.toThrow('endpoint required for http transports');
	});

	it('handles HTTP error responses', async () => {
		const server = http.createServer((_req, res) => {
			res.statusCode = 500;
			res.end('Server Error');
		});
		await new Promise<void>((resolve) => server.listen(0, () => resolve()));
		const port = (server.address() as AddressInfo).port;

		const client = await createEnhancedClient({
			name: 'http-error-test',
			transport: 'streamableHttp',
			endpoint: `http://127.0.0.1:${port}`,
		});

		await expect(
			client.callTool({ name: 'tool', arguments: { a: 1 } }),
		).rejects.toThrow('HTTP 500');

		await client.close();
		server.close();
	});
});
