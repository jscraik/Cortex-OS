import crypto from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Application } from 'express';
import { beforeAll, describe, expect, it, vi } from 'vitest';

// Mock semgrep scanner to avoid running external tools
vi.mock('../../src/lib/semgrep-scanner.js', () => ({
	runSemgrepScan: vi.fn(async () => []),
}));

// Mock Octokit to avoid real API calls
vi.mock('@octokit/rest', () => ({
	Octokit: class {
		rest = {
			checks: { create: vi.fn(async () => ({ data: { html_url: 'http://example/check' } })) },
			pulls: { get: vi.fn(), listFiles: vi.fn() },
			issues: { createComment: vi.fn(async () => ({})) },
			reactions: {
				createForIssueComment: vi.fn(async () => ({})),
				createForPullRequestReviewComment: vi.fn(async () => ({})),
			},
		};
	},
}));

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
	process.env.GITHUB_TOKEN = 't';
	process.env.WEBHOOK_SECRET = 's';
	const mod = await import('../../src/server/app');
	app = mod.app;
});

describe('Semgrep /webhook positive', () => {
	it('accepts valid signature and returns 200', async () => {
		const bodyStr = JSON.stringify({
			ref: 'refs/heads/main',
			repository: { owner: { login: 'o' }, name: 'r' },
			head_commit: { id: 'abc' },
		});
		const body = Buffer.from(bodyStr);
		const sig = crypto
			.createHmac('sha256', process.env.WEBHOOK_SECRET as string)
			.update(body)
			.digest('hex');
		const resp = await post(
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
		expect(resp.status).toBe(200);
	});
});
