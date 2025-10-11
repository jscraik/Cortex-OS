import http from 'node:http';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
	callVibeCheck,
	checkConstitution,
	resetConstitution,
	updateConstitution,
} from '../src/mcp/clients/vibe-check-client.js';

let server: http.Server;
let port = 0;

beforeAll(async () => {
	server = http.createServer((req, res) => {
		if (req.method === 'POST' && req.url === '/tools/call') {
			let body = '';
			req.on('data', (c) => {
				body += c;
			});
			req.on('end', () => {
				try {
					const parsed = JSON.parse(body || '{}');

					// Handle vibe_check tool
					if (parsed.name === 'vibe_check') {
						const args = parsed.arguments || {};
						if (!args.goal || !args.plan || !args.sessionId) {
							res.writeHead(400, { 'Content-Type': 'application/json' });
							res.end(
								JSON.stringify({
									error: { code: 'invalid_args', message: 'Missing required fields' },
								}),
							);
							return;
						}
						res.writeHead(200, { 'Content-Type': 'application/json' });
						res.end(
							JSON.stringify({
								result: {
									questions: [
										'What is the expected outcome?',
										'Have you considered security implications?',
									],
									risk: 'medium',
									notes: ['Consider edge cases', 'Add error handling'],
								},
							}),
						);
						return;
					}

					// Handle update_constitution tool
					if (parsed.name === 'update_constitution') {
						const args = parsed.arguments || {};
						if (!args.sessionId || !args.rules || !Array.isArray(args.rules)) {
							res.writeHead(400, { 'Content-Type': 'application/json' });
							res.end(
								JSON.stringify({
									error: { code: 'invalid_args', message: 'Invalid constitution rules' },
								}),
							);
							return;
						}
						res.writeHead(200, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ result: { ok: true } }));
						return;
					}

					// Handle reset_constitution tool
					if (parsed.name === 'reset_constitution') {
						const args = parsed.arguments || {};
						if (!args.sessionId) {
							res.writeHead(400, { 'Content-Type': 'application/json' });
							res.end(
								JSON.stringify({ error: { code: 'invalid_args', message: 'Missing sessionId' } }),
							);
							return;
						}
						res.writeHead(200, { 'Content-Type': 'application/json' });
						res.end(JSON.stringify({ result: { ok: true } }));
						return;
					}

					// Handle check_constitution tool
					if (parsed.name === 'check_constitution') {
						const args = parsed.arguments || {};
						if (!args.sessionId) {
							res.writeHead(400, { 'Content-Type': 'application/json' });
							res.end(
								JSON.stringify({ error: { code: 'invalid_args', message: 'Missing sessionId' } }),
							);
							return;
						}
						res.writeHead(200, { 'Content-Type': 'application/json' });
						res.end(
							JSON.stringify({
								result: {
									rules: [
										'No network calls without permission',
										'Always validate inputs',
										'Log all actions',
									],
								},
							}),
						);
						return;
					}

					// Unknown tool
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.end(
						JSON.stringify({
							error: { code: 'unknown_tool', message: `Unknown tool: ${parsed.name}` },
						}),
					);
				} catch (e) {
					res.writeHead(500, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: { code: 'internal_error', message: String(e) } }));
				}
			});
			return;
		}
		res.writeHead(404);
		res.end();
	});

	await new Promise<void>((resolve) => {
		server.listen(0, '127.0.0.1', () => {
			// @ts-expect-error - port is available after listen
			port = server.address().port;
			process.env.VIBE_CHECK_HTTP_URL = `http://127.0.0.1:${port}`;
			resolve();
		});
	});
});

afterAll(async () => {
	await new Promise<void>((resolve) => {
		server.close(() => resolve());
	});
});

describe('vibe-check-client', () => {
	describe('callVibeCheck', () => {
		test('returns questions and risk assessment on success', async () => {
			const result = await callVibeCheck({
				goal: 'Implement user authentication',
				plan: 'Use OAuth2 with JWT tokens',
				sessionId: 'test-session-001',
			});

			expect(result.questions).toHaveLength(2);
			expect(result.questions).toContain('What is the expected outcome?');
			expect(result.risk).toBe('medium');
			expect(result.notes).toBeDefined();
			expect(result.notes?.length).toBeGreaterThan(0);
		});

		test('validates required fields with Zod', async () => {
			await expect(
				// @ts-expect-error - intentionally missing fields for validation test
				callVibeCheck({ goal: '', plan: 'test', sessionId: 'test' }),
			).rejects.toThrow();

			await expect(
				// @ts-expect-error - intentionally missing fields for validation test
				callVibeCheck({ goal: 'test', plan: '', sessionId: 'test' }),
			).rejects.toThrow();

			await expect(
				// @ts-expect-error - intentionally missing fields for validation test
				callVibeCheck({ goal: 'test', plan: 'test', sessionId: '' }),
			).rejects.toThrow();
		});

		test('handles HTTP errors gracefully with brAInwav branding', async () => {
			// Temporarily set invalid URL to trigger HTTP error
			const originalUrl = process.env.VIBE_CHECK_HTTP_URL;
			process.env.VIBE_CHECK_HTTP_URL = 'http://127.0.0.1:1';

			try {
				await callVibeCheck({
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

	describe('updateConstitution', () => {
		test('updates constitution rules successfully', async () => {
			const result = await updateConstitution({
				sessionId: 'test-session-002',
				rules: ['No network calls without permission', 'Always validate inputs'],
			});

			expect(result.ok).toBe(true);
		});

		test('validates required fields', async () => {
			await expect(
				// @ts-expect-error - intentionally missing fields
				updateConstitution({ sessionId: '' }),
			).rejects.toThrow();

			await expect(
				// @ts-expect-error - intentionally missing fields
				updateConstitution({ sessionId: 'test', rules: [] }),
			).rejects.toThrow();
		});
	});

	describe('resetConstitution', () => {
		test('resets constitution successfully', async () => {
			const result = await resetConstitution({
				sessionId: 'test-session-003',
			});

			expect(result.ok).toBe(true);
		});

		test('validates sessionId', async () => {
			await expect(
				// @ts-expect-error - intentionally invalid
				resetConstitution({ sessionId: '' }),
			).rejects.toThrow();
		});
	});

	describe('checkConstitution', () => {
		test('retrieves current constitution rules', async () => {
			const result = await checkConstitution({
				sessionId: 'test-session-004',
			});

			expect(result.rules).toBeDefined();
			expect(Array.isArray(result.rules)).toBe(true);
			expect(result.rules?.length).toBeGreaterThan(0);
		});

		test('validates sessionId', async () => {
			await expect(
				// @ts-expect-error - intentionally invalid
				checkConstitution({ sessionId: '' }),
			).rejects.toThrow();
		});

		test('handles empty constitution gracefully', async () => {
			const result = await checkConstitution({
				sessionId: 'empty-session',
			});

			expect(result).toBeDefined();
			// Rules might be undefined or empty array
		});
	});

	describe('error handling', () => {
		test('includes error context in exception message', async () => {
			const originalUrl = process.env.VIBE_CHECK_HTTP_URL;
			process.env.VIBE_CHECK_HTTP_URL = 'http://127.0.0.1:1';

			try {
				await callVibeCheck({
					goal: 'test',
					plan: 'test',
					sessionId: 'test',
				});
				expect.fail('Should have thrown an error');
			} catch (error) {
				const errorStr = String(error);
				expect(errorStr).toContain('brAInwav-vibe-check');
				expect(errorStr).toMatch(/HTTP \d+/);
			} finally {
				process.env.VIBE_CHECK_HTTP_URL = originalUrl;
			}
		});
	});
});
