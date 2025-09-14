import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { createEnhancedClient } from '../src/client.js';

describe('EnhancedClient ping & graceful close', () => {
	it('ping works over http', async () => {
		const server = http.createServer((req, res) => {
			let body = '';
			req.on('data', (c) => {
				body += c;
			});
			req.on('end', () => {
				try {
					const parsed = JSON.parse(body || '{}');
					if (parsed.name === 'ping') {
						res.setHeader('Content-Type', 'application/json');
						res.end(JSON.stringify({ ok: true }));
						return;
					}
					res.setHeader('Content-Type', 'application/json');
					res.end(JSON.stringify({ echoed: parsed.name }));
				} catch {
					res.statusCode = 400;
					res.end('bad');
				}
			});
		});
		await new Promise<void>((r) => server.listen(0, r));
		const port = (server.address() as AddressInfo).port;
		const client = await createEnhancedClient({
			name: 'p',
			transport: 'http',
			endpoint: `http://localhost:${port}`,
		});
		await expect(client.ping()).resolves.toBeUndefined();
		await client.close();
		server.close();
	});

	it('close rejects new calls (stdio)', async () => {
		const client = await createEnhancedClient({
			name: 's',
			transport: 'stdio',
			command: process.execPath,
			args: [
				'-e',
				'process.stdin.on("data", d => { /* never respond to simulate pending */ })',
			],
		});
		const pending = client.callTool({ name: 'never' });
		await client.close();
		await expect(pending).rejects.toThrow('Client is closed');
		await expect(client.callTool({ name: 'later' })).rejects.toThrow(
			'Client is closed',
		);
	});
});
