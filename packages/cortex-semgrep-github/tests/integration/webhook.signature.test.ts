import http from 'node:http';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/server/app.js';

// Ensure test env
beforeEach(() => {
	process.env.NODE_ENV = 'test';
});

async function post(app: any, path: string, headers: Record<string, string>, body: Buffer) {
	const server = http.createServer(app);
	await new Promise<void>((r) => server.listen(0, r));
	const { port } = server.address() as any;
	const url = `http://127.0.0.1:${port}${path}`;
	const resp = await fetch(url, { method: 'POST', headers, body });
	server.close();
	return resp;
}

describe('Semgrep /webhook', () => {
	it('returns 401 when signature invalid', async () => {
		const resp = await post(
			app,
			'/webhook',
			{
				'X-GitHub-Event': 'issue_comment',
				'X-GitHub-Delivery': 'd1',
				'X-Hub-Signature-256': 'sha256=bad',
				'Content-Type': 'application/json',
			},
			Buffer.from('{}'),
		);
		expect(resp.status).toBe(401);
	});
});
