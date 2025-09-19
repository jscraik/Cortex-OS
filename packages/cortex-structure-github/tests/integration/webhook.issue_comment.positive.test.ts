import crypto from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Application } from 'express';
import { beforeAll, describe, expect, it, vi } from 'vitest';

let app: Application;

// Mock Octokit interactions for reactions and comments
const reactions = {
	createForIssueComment: vi.fn(async () => ({})),
};
const issues = {
	createComment: vi.fn(async () => ({})),
};
vi.mock('@octokit/rest', () => ({
	Octokit: class {
		rest = { reactions, issues };
	},
}));

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

describe('Structure /webhook positive - issue_comment @insula help', () => {
	it('responds with help comment', async () => {
		const payload = {
			action: 'created',
			comment: { id: 2, body: '@insula help', user: { login: 'dev' } },
			repository: { owner: { login: 'o' }, name: 'r' },
			issue: { number: 99 },
			sender: { login: 'dev' },
		};
		const bodyStr = JSON.stringify(payload);
		const body = Buffer.from(bodyStr);
		const sig = crypto
			.createHmac('sha256', process.env.WEBHOOK_SECRET as string)
			.update(body)
			.digest('hex');
		const res = await post(
			app,
			'/webhook',
			{
				'X-GitHub-Event': 'issue_comment',
				'X-GitHub-Delivery': 'ic-1',
				'X-Hub-Signature-256': `sha256=${sig}`,
				'Content-Type': 'application/json',
			},
			bodyStr,
		);
		expect(res.status).toBe(200);
		// Help path posts a help comment; it does not add reactions by design
		expect(issues.createComment).toHaveBeenCalled();
	});
});
