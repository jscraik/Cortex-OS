import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Application } from 'express';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

let app: Application;

async function post(
	app: http.RequestListener,
	path: string,
	headers: Record<string, string>,
	body: string,
) {
	const server = http.createServer(app);
	await new Promise<void>((r) => server.listen(0, r));
	const { port } = server.address() as AddressInfo;
	const url = `http://127.0.0.1:${port}${path}`;
	const resp = await fetch(url, { method: 'POST', headers, body });
	server.close();
	return resp;
}

beforeAll(async () => {
	const mod = await import('../../src/server/app');
	app = mod.app;
});

beforeEach(() => {
	process.env.NODE_ENV = 'test';
});

describe('Structure /webhook', () => {
	it('returns 401 when signature invalid', async () => {
		const res = await post(
			app,
			'/webhook',
			{
				'X-GitHub-Event': 'push',
				'X-GitHub-Delivery': 'd1',
				'X-Hub-Signature-256': 'sha256=bad',
				'Content-Type': 'application/json',
			},
			'{}',
		);
		expect(res.status).toBe(401);
	});
});
