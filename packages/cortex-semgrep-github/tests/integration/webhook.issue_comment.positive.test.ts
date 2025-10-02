import crypto from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Application } from 'express';
import { beforeAll, describe, expect, it, vi } from 'vitest';

let app: Application;

// Mock semgrep scanner internals to simulate findings processing
const mockRunSemgrepScan = vi.fn(async () => [
	{ ruleId: 'xss', severity: 'HIGH', file: 'src/a', startLine: 10, message: 'Potential XSS' },
]);
vi.mock('../../src/lib/semgrep-scanner.js', () => ({
	runSemgrepScan: mockRunSemgrepScan,
}));

// Mock Octokit to capture comment reactions and check creation
const reactions = {
	createForIssueComment: vi.fn(async () => ({})),
};
const issues = {
	createComment: vi.fn(async () => ({})),
};
const checks = { create: vi.fn(async () => ({ data: { html_url: 'http://example/check' } })) };
vi.mock('@octokit/rest', () => ({
	Octokit: class {
		rest = {
			reactions,
			issues,
			checks,
			pulls: {
				get: vi.fn(async () => ({ data: { head: { sha: 'deadbeef' } } })),
				listFiles: vi.fn(),
			},
		};
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
	process.env.GITHUB_TOKEN = 't';
	process.env.WEBHOOK_SECRET = 's';
	// Ensure fresh import so mocks apply to Octokit instance
	vi.resetModules();
	const mod = await import('../../src/server/app');
	app = mod.app;
});

describe('Semgrep /webhook positive - issue_comment scan', () => {
	it('triggers scan and reacts with eyes', async () => {
		const payload = {
			action: 'created',
			comment: { id: 1, body: '@semgrep scan', user: { login: 'dev' } },
			repository: { owner: { login: 'o' }, name: 'r', full_name: 'o/r' },
			issue: { number: 42, pull_request: { url: 'https://api.github.com/repos/o/r/pulls/42' } },
			sender: { login: 'dev' },
		};
		const bodyStr = JSON.stringify(payload);
		const body = Buffer.from(bodyStr);
		const sig = crypto
			.createHmac('sha256', process.env.WEBHOOK_SECRET as string)
			.update(body)
			.digest('hex');
		const resp = await post(
			app,
			'/webhook',
			{
				'X-GitHub-Event': 'issue_comment',
				'X-GitHub-Delivery': 'abc123',
				'X-Hub-Signature-256': `sha256=${sig}`,
				'Content-Type': 'application/json',
			},
			bodyStr,
		);
		expect(resp.status).toBe(200);
		expect(issues.createComment).toHaveBeenCalled();
		expect(mockRunSemgrepScan).toHaveBeenCalled();
	});
});
