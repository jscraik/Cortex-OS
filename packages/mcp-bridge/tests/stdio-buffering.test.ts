import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { StdioHttpBridge } from '../src/stdio-http.js';

describe('StdioHttpBridge stdin buffering', () => {
	it('processes multiple JSON-RPC frames in a single chunk', async () => {
		// Mock HTTP target that echoes id
		const server = http.createServer((req, res) => {
			let body = '';
			req.on('data', (c) => {
				body += c;
			});
			req.on('end', () => {
				const parsed = JSON.parse(body);
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify({ id: parsed.id, result: { ok: true } }));
			});
		});
		await new Promise<void>((r) => server.listen(0, r));
		const port = (server.address() as AddressInfo).port;
		const stdin = new PassThrough();
		const stdout = new PassThrough();
		const bridge = new StdioHttpBridge({
			httpEndpoint: `http://127.0.0.1:${port}`,
			stdin,
			stdout,
		});
		await bridge.start();

		stdin.write('{"id":1,"method":"a"}\n{"id":2,"method":"b"}\n');

		const out: string[] = [];
		stdout.on('data', (d) => out.push(d.toString().trim()));

		await new Promise((r) => setTimeout(r, 50));
		await bridge.close();
		server.close();
		expect(out.length).toBe(2);
		const ids = out.map((l) => JSON.parse(l).id).sort();
		expect(ids).toEqual([1, 2]);
	});

	it('returns helpful error on 404', async () => {
		const server = http.createServer((_req, res) => {
			res.statusCode = 404;
			res.end('missing');
		});
		await new Promise<void>((r) => server.listen(0, r));
		const port = (server.address() as AddressInfo).port;
		const bridge = new StdioHttpBridge({
			httpEndpoint: `http://127.0.0.1:${port}`,
		});
		try {
			await expect(bridge.forward({ id: 1, method: 'x' })).rejects.toThrow(/HTTP 404/);
		} finally {
			await bridge.close();
			server.close();
		}
	});
});
