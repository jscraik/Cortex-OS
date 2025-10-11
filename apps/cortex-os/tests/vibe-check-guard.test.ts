import http from 'node:http';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { runVibeCheckGuard } from '../src/operational/vibe-check-guard.js';

let server: http.Server;
let port = 0;
let requestLog: Array<{ name: string; args: unknown }> = [];

beforeAll(async () => {
	server = http.createServer((req, res) => {
		if (req.method === 'POST' && req.url === '/tools/call') {
			let body = '';
			req.on('data', (c) => {
				body += c;
			});
			req.on('end', () => {
				const parsed = JSON.parse(body || '{}');
				requestLog.push({ name: parsed.name, args: parsed.arguments });

				if (parsed.name === 'update_constitution') {
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ result: { ok: true } }));
					return;
				}
				if (parsed.name === 'vibe_check') {
					res.writeHead(200, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ result: { questions: ['q1'], risk: 'low' } }));
					return;
				}
				res.writeHead(400, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: { code: 'unknown_tool', message: 'unknown' } }));
			});
			return;
		}
		res.writeHead(404);
		res.end();
	});

	await new Promise<void>((resolve) =>
		server.listen(0, '127.0.0.1', () => {
			// @ts-expect-error
			port = server.address().port;
			process.env.VIBE_CHECK_HTTP_URL = `http://127.0.0.1:${port}`;
			resolve();
		}),
	);
});

afterAll(async () => {
	await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('vibe-check-guard', () => {
	beforeEach(() => {
		requestLog = [];
	});

	describe('runVibeCheckGuard', () => {
		test('updates constitution and calls vibe_check in sequence', async () => {
			const result = await runVibeCheckGuard({
				goal: 'Build feature',
				plan: 'Write tests first',
				sessionId: 's1',
				rules: ['no network'],
			});

			expect(result.risk).toBe('low');
			expect(result.questions).toContain('q1');

			// Verify constitution was updated before vibe_check
			expect(requestLog).toHaveLength(2);
			expect(requestLog[0].name).toBe('update_constitution');
			expect(requestLog[0].args.rules).toContain('no network');
			expect(requestLog[1].name).toBe('vibe_check');
		});

		test('skips constitution update when rules not provided', async () => {
			const result = await runVibeCheckGuard({
				goal: 'Build feature',
				plan: 'Write tests first',
				sessionId: 's2',
			});

			expect(result.risk).toBe('low');

			// Verify only vibe_check was called
			expect(requestLog).toHaveLength(1);
			expect(requestLog[0].name).toBe('vibe_check');
		});

		test('skips constitution update when rules array is empty', async () => {
			const result = await runVibeCheckGuard({
				goal: 'Build feature',
				plan: 'Write tests first',
				sessionId: 's3',
				rules: [],
			});

			expect(result.risk).toBe('low');

			// Verify only vibe_check was called
			expect(requestLog).toHaveLength(1);
			expect(requestLog[0].name).toBe('vibe_check');
		});

		test('validates input with Zod schema', async () => {
			await expect(
				// @ts-expect-error - intentionally invalid
				runVibeCheckGuard({ goal: '', plan: 'p', sessionId: 's' }),
			).rejects.toThrow();

			await expect(
				// @ts-expect-error - intentionally invalid
				runVibeCheckGuard({ goal: 'g', plan: '', sessionId: 's' }),
			).rejects.toThrow();

			await expect(
				// @ts-expect-error - intentionally invalid
				runVibeCheckGuard({ goal: 'g', plan: 'p', sessionId: '' }),
			).rejects.toThrow();
		});

		test('propagates errors from constitution update', async () => {
			// Temporarily break the server to test error handling
			const originalUrl = process.env.VIBE_CHECK_HTTP_URL;
			process.env.VIBE_CHECK_HTTP_URL = 'http://127.0.0.1:1';

			try {
				await runVibeCheckGuard({
					goal: 'test',
					plan: 'test',
					sessionId: 'test',
					rules: ['test rule'],
				});
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(String(error)).toContain('brAInwav-vibe-check');
			} finally {
				process.env.VIBE_CHECK_HTTP_URL = originalUrl;
			}
		});

		test('propagates errors from vibe_check', async () => {
			const originalUrl = process.env.VIBE_CHECK_HTTP_URL;
			process.env.VIBE_CHECK_HTTP_URL = 'http://127.0.0.1:1';

			try {
				await runVibeCheckGuard({
					goal: 'test',
					plan: 'test',
					sessionId: 'test',
				});
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(String(error)).toContain('brAInwav-vibe-check');
			} finally {
				process.env.VIBE_CHECK_HTTP_URL = originalUrl;
			}
		});
	});
});
