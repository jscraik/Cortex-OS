import type { Client } from 'pg';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	AUTH_HOOK_TIMEOUT_MS,
	shouldSkipAuthDb,
	startAuthDb,
	truncateAuthTables,
} from './helpers/postgres.js';

declare global {
	var __brAInwavBetterAuthLastError: unknown;
}

process.env.BRAINWAV_DEBUG_AUTH = '1';

console.error('[brAInwav][auth-tests] console error smoke test');

const SKIP_SCOPE = 'auth-postgres';

const skip = shouldSkipAuthDb(SKIP_SCOPE);
console.info(`[brAInwav][auth-tests] shouldSkipAuthDb(${SKIP_SCOPE}) => ${skip}`);

if (skip) {
	describe.skip('Auth persistence with Postgres', () => {
		it('skips when container runtime is unavailable', () => {
			expect(true).toBe(true);
		});
	});
} else {
	describe('Auth persistence with Postgres', () => {
		let dbHandle: { client: Client; stop: () => Promise<void>; connectionString: string };
		let pgClient: Client;

		const resetApp = async () => {
			vi.resetModules();
			const mod = await import('../../src/server.js');
			return mod.app;
		};

		beforeAll(async () => {
			process.env.NODE_ENV = 'test';
			process.env.BETTER_AUTH_SECRET = 'test-secret';
			process.env.BETTER_AUTH_URL = 'http://localhost:3001/auth';

			dbHandle = await startAuthDb();
			pgClient = dbHandle.client;
			process.env.DATABASE_URL = dbHandle.connectionString;
		}, AUTH_HOOK_TIMEOUT_MS);

		afterAll(async () => {
			if (pgClient) {
				await truncateAuthTables(pgClient);
				await pgClient.end();
			}
			if (dbHandle) {
				await dbHandle.stop();
			}
		}, AUTH_HOOK_TIMEOUT_MS);

		beforeEach(async () => {
			await truncateAuthTables(pgClient);
		});

		afterEach(async () => {
			await truncateAuthTables(pgClient);
		});

		it('persists user and session across app restarts', async () => {
			const initialApp = await resetApp();

			const email = 'persist@example.com';

			const strongPassword = 'PersistPass123!@#brAInwav';

			const registerResponse = await request(initialApp).post('/auth/register').send({
				email,
				password: strongPassword,
				name: 'Persist User',
			});

			const isRegisterStatusExpected =
				registerResponse.status === 200 || registerResponse.status === 201;

			if (!isRegisterStatusExpected) {
				console.error('[brAInwav][auth-tests] register failure', {
					status: registerResponse.status,
					headers: registerResponse.headers,
					body: registerResponse.body,
					text: registerResponse.text,
					lastError: globalThis.__brAInwavBetterAuthLastError,
					adapterFailure: (globalThis as Record<string, unknown>)
						.__brAInwavBetterAuthAdapterFailure,
				});

				const authModule = await import('../../src/auth/config.js');
				const { auth: debugAuth, AUTH_BASE_URL } = authModule as unknown as {
					auth: { api: { signUpEmail?: { handler?: (request: Request) => Promise<Response> } } };
					AUTH_BASE_URL: string;
				};
				const signUpEmail = debugAuth.api.signUpEmail as unknown as {
					handler?: (request: Request) => Promise<Response>;
				};
				if (typeof signUpEmail?.handler === 'function') {
					const debugRequest = new Request(
						`${AUTH_BASE_URL ?? 'http://localhost:3001/auth'}/sign-up/email`,
						{
							method: 'POST',
							headers: {
								'content-type': 'application/json',
							},
							body: JSON.stringify({
								email,
								password: strongPassword,
								name: 'Persist User',
							}),
						},
					);
					const debugResponse = await signUpEmail.handler(debugRequest);
					const debugText = await debugResponse.text();
					console.error('[brAInwav][auth-tests] direct signUpEmail handler response', {
						status: debugResponse.status,
						text: debugText,
					});
				}
			}

			const lastError = (globalThis as Record<string, unknown>).__brAInwavBetterAuthLastError;
			const adapterFailure = (globalThis as Record<string, unknown>)
				.__brAInwavBetterAuthAdapterFailure;
			expect(
				isRegisterStatusExpected,
				`[brAInwav][auth-tests] register failure status=${registerResponse.status} body=${JSON.stringify(registerResponse.body)} text=${registerResponse.text} error=${lastError ? JSON.stringify(lastError, null, 2) : '<none>'} adapterFailure=${adapterFailure ? JSON.stringify(adapterFailure, null, 2) : '<none>'}`,
			).toBe(true);

			const loginResponse = await request(initialApp)
				.post('/auth/login')
				.send({
					email,
					password: strongPassword,
				})
				.expect(200);

			const token: string | undefined =
				loginResponse.body?.session?.token ?? loginResponse.body?.token;

			if (!token) {
				console.error('[brAInwav][auth-tests] missing session token after login', {
					status: loginResponse.status,
					body: loginResponse.body,
					text: loginResponse.text,
					headers: loginResponse.headers,
				});
			}
			expect(
				token,
				`[brAInwav][auth-tests] login response ${JSON.stringify(loginResponse.body)} text=${loginResponse.text}`,
			).toBeDefined();

			const userRows = await pgClient.query('SELECT email FROM "User" WHERE email = $1', [email]);
			expect(userRows.rowCount ?? 0).toBeGreaterThanOrEqual(1);

			const sessionRows = await pgClient.query('SELECT token FROM "Session" WHERE token = $1', [
				token,
			]);
			expect(sessionRows.rowCount ?? 0).toBeGreaterThanOrEqual(1);

			const restartedApp = await resetApp();

			await request(restartedApp)
				.get('/api/me')
				.set('Authorization', `Bearer ${token}`)
				.expect(200);
		});
	});
}
