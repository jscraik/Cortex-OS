import crypto from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Application } from 'express';
import { beforeAll, describe, expect, it } from 'vitest';

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
	process.env.NODE_ENV = 'test';
	process.env.WEBHOOK_SECRET = 's';
	const mod = await import('../../src/server/app');
	app = mod.app;
});

describe('Structure /webhook positive', () => {
	it('accepts valid signature and returns 200', async () => {
		const bodyStr = JSON.stringify({
			repository: {
				full_name: 'o/r',
				owner: { login: 'o' },
				name: 'r',
				clone_url: 'https://github.com/o/r.git',
				default_branch: 'main',
			},
			commits: [],
			after: 'abc',
		});
		const body = Buffer.from(bodyStr);
		const sig = crypto
			.createHmac('sha256', process.env.WEBHOOK_SECRET as string)
			.update(body)
			.digest('hex');
		const res = await post(
			app,
			'/webhook',
			{
				'X-GitHub-Event': 'push',
				'X-GitHub-Delivery': 'd2',
				'X-Hub-Signature-256': `sha256=${sig}`,
				'Content-Type': 'application/json',
			},
			bodyStr,
		);
		// Structure app currently returns 200 on success
		expect(res.status).toBe(200);
	});
});
