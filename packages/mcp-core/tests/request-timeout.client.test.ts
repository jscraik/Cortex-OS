import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { createEnhancedClient, TimeoutError } from '../src/client.js';

describe('createEnhancedClient requestTimeoutMs', () => {
	it('HTTP transport: times out slow response', async () => {
		const server = http.createServer((_req, res) => {
			setTimeout(() => {
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify({ echo: 'late' }));
			}, 120);
		});
		await new Promise<void>((r) => server.listen(0, r));
		const port = (server.address() as AddressInfo).port;
		const client = await createEnhancedClient({
			name: 't',
			transport: 'http',
			endpoint: `http://localhost:${port}`,
			requestTimeoutMs: 40,
		});
		await expect(client.callTool({ name: 'x' })).rejects.toBeInstanceOf(TimeoutError);
		await client.close();
		server.close();
	});

	it('stdio transport: times out blocking call', async () => {
		const client = await createEnhancedClient({
			name: 'slow-stdio',
			transport: 'stdio',
			command: process.execPath,
			args: ['-e', `setTimeout(()=>{ /* never respond */ }, 200)`],
			requestTimeoutMs: 30,
		});
		await expect(client.callTool({ name: 'noreply' })).rejects.toBeInstanceOf(TimeoutError);
		await client.close();
	});
});
