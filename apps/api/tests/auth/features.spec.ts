import { authenticator } from 'otplib';
import type { Client } from 'pg';
import type { SuperTest, Test } from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	AUTH_HOOK_TIMEOUT_MS,
	shouldSkipAuthDb,
	startAuthDb,
	truncateAuthTables,
} from './helpers/postgres.js';

const SKIP_SCOPE = 'auth-features';

const skip = shouldSkipAuthDb(SKIP_SCOPE);

authenticator.options = { step: 30, window: 1 };

if (skip) {
	describe.skip('Auth feature routes with Postgres', () => {
		it('skips when container runtime is unavailable', () => {
			expect(true).toBe(true);
		});
	});
} else {
	describe('Auth feature routes with Postgres', () => {
		let dbHandle: { client: Client; stop: () => Promise<void>; connectionString: string };
		let pgClient: Client;
		let app: import('express').Express;
		let supertestFactory: ((application: import('express').Express) => SuperTest<Test>) | undefined;

		const request = (application: import('express').Express) => {
			if (!supertestFactory) {
				throw new Error('supertest factory not initialised');
			}
			return supertestFactory(application);
		};

		const resetApp = async () => {
			vi.resetModules();
			const mod = await import('../../src/server.js');
			return mod.app;
		};

		const registerUser = async (email: string, password: string, name: string) => {
			const response = await request(app).post('/auth/register').send({ email, password, name });
			const isExpectedStatus = response.status === 200 || response.status === 201;
			if (!isExpectedStatus) {
				console.error('[brAInwav][auth-tests] register failure (features spec)', {
					status: response.status,
					headers: response.headers,
					body: response.body,
					text: response.text,
					lastError: (globalThis as Record<string, unknown>).__brAInwavBetterAuthLastError,
					adapterFailure: (globalThis as Record<string, unknown>)
						.__brAInwavBetterAuthAdapterFailure,
				});
			}
			expect(isExpectedStatus).toBe(true);
			return response.body;
		};

		const loginUser = async (email: string, password: string) => {
			const response = await request(app).post('/auth/login').send({ email, password }).expect(200);
			const session = response.body?.session;
			const token: string | undefined = session?.token ?? response.body?.token;
			let sessionId: string | undefined = session?.id ?? response.body?.sessionId;
			if (token && !sessionId) {
				const result = await pgClient.query('SELECT id FROM "Session" WHERE token = $1', [token]);
				sessionId = result.rows?.[0]?.id;
			}
			if (!token || !sessionId) {
				console.error('[brAInwav][auth-tests] login session missing data (features spec)', {
					status: response.status,
					body: response.body,
					text: response.text,
					headers: response.headers,
					databaseLookup: sessionId ? 'found' : 'missing',
				});
			}
			expect(token).toBeTruthy();
			expect(sessionId).toBeTruthy();
			return { token: token as string, id: sessionId as string };
		};

		beforeAll(async () => {
			process.env.NODE_ENV = 'test';
			process.env.BETTER_AUTH_SECRET = 'test-secret';
			process.env.BETTER_AUTH_URL = 'http://localhost:3001/auth';

			dbHandle = await startAuthDb();
			pgClient = dbHandle.client;
			process.env.DATABASE_URL = dbHandle.connectionString;
			const mod = await import('supertest');
			const exported = mod as unknown as {
				default?: (application: import('express').Express) => SuperTest<Test>;
			};
			supertestFactory =
				exported.default ??
				(mod as unknown as (application: import('express').Express) => SuperTest<Test>);
			app = await resetApp();
		}, AUTH_HOOK_TIMEOUT_MS);

		afterAll(async () => {
			await truncateAuthTables(pgClient);
			await pgClient.end();
			await dbHandle.stop();
		}, AUTH_HOOK_TIMEOUT_MS);

		beforeEach(async () => {
			await truncateAuthTables(pgClient);
		});

		afterEach(async () => {
			await truncateAuthTables(pgClient);
		});

		it('supports profile update and session management', async () => {
			const email = 'feature@example.com';
			const password = 'FeaturePass123!';
			await registerUser(email, password, 'Feature User');
			const primarySession = await loginUser(email, password);

			const meResponse = await request(app)
				.get('/api/me')
				.set('Authorization', `Bearer ${primarySession.token}`)
				.expect(200);
			expect(meResponse.body?.user?.email).toBe(email);

			await request(app)
				.put('/api/me')
				.set('Authorization', `Bearer ${primarySession.token}`)
				.send({ name: 'Updated User', image: 'https://example.com/avatar.png' })
				.expect(200);

			const dbUser = await pgClient.query('SELECT name, image FROM "User" WHERE email = $1', [
				email,
			]);
			expect(dbUser.rows[0]?.name).toBe('Updated User');

			const secondarySession = await loginUser(email, password);

			const sessionsResponse = await request(app)
				.get('/api/sessions')
				.set('Authorization', `Bearer ${primarySession.token}`)
				.expect(200);
			const sessionIds: string[] = sessionsResponse.body.sessions.map((s: { id: string }) => s.id);
			expect(sessionIds).toEqual(expect.arrayContaining([primarySession.id, secondarySession.id]));

			await request(app)
				.delete(`/api/sessions/${secondarySession.id}`)
				.set('Authorization', `Bearer ${primarySession.token}`)
				.expect(200);

			const remainingSessions = await request(app)
				.get('/api/sessions')
				.set('Authorization', `Bearer ${primarySession.token}`)
				.expect(200);
			const remainingIds: string[] = remainingSessions.body.sessions.map(
				(s: { id: string }) => s.id,
			);
			expect(remainingIds).toContain(primarySession.id);
			expect(remainingIds).not.toContain(secondarySession.id);
		});

		it('prevents revoking the current session and manages 2FA lifecycle', async () => {
			const email = 'twofa@example.com';
			const password = 'TwoFactor123!';
			await registerUser(email, password, 'Two Factor User');
			const session = await loginUser(email, password);

			await request(app)
				.delete(`/api/sessions/${session.id}`)
				.set('Authorization', `Bearer ${session.token}`)
				.expect(400);

			const enableResponse = await request(app)
				.post('/api/2fa/enable')
				.set('Authorization', `Bearer ${session.token}`)
				.expect(200);

			expect(enableResponse.body.secret).toBeTypeOf('string');
			expect(Array.isArray(enableResponse.body.backupCodes)).toBe(true);

			const generatedCode = authenticator.generate(enableResponse.body.secret as string);
			const verifyResponse = await request(app)
				.post('/api/2fa/verify')
				.set('Authorization', `Bearer ${session.token}`)
				.send({ code: generatedCode })
				.expect(200);

			expect(verifyResponse.body.method).toBe('totp');
			expect(verifyResponse.body.backupCodesRemaining).toBeGreaterThanOrEqual(0);

			await request(app)
				.post('/api/2fa/verify')
				.set('Authorization', `Bearer ${session.token}`)
				.send({ code: 'invalid-code' })
				.expect(400);

			const twoFactorState = await pgClient.query(
				'SELECT "twoFactorEnabled" FROM "User" WHERE email = $1',
				[email],
			);
			expect(twoFactorState.rows[0]?.twoFactorEnabled).toBe(true);
		});

		it('registers and authenticates passkeys', async () => {
			const email = 'passkey@example.com';
			const password = 'Passkey123!';
			await registerUser(email, password, 'Passkey User');
			const session = await loginUser(email, password);

			const registerResponse = await request(app)
				.post('/api/passkeys/register')
				.set('Authorization', `Bearer ${session.token}`)
				.send({ name: 'Main Device' })
				.expect(201);

			const credentialId = registerResponse.body?.passkey?.credentialId as string;
			const publicKey = registerResponse.body?.passkey?.publicKey as string;
			expect(typeof credentialId).toBe('string');
			expect(typeof publicKey).toBe('string');

			const storedCredential = await pgClient.query(
				'SELECT "userId", "credentialId", "publicKey", "counter" FROM "PasskeyCredential" WHERE "credentialId" = $1',
				[credentialId],
			);
			expect(storedCredential.rows[0]?.credentialId).toBe(credentialId);
			expect(storedCredential.rows[0]?.publicKey).toBe(publicKey);
			expect(storedCredential.rows[0]?.counter).toBe(0);

			const authResponse = await request(app)
				.post('/api/passkeys/authenticate')
				.send({ credentialId })
				.expect(200);

			expect(authResponse.body.userId).toBe(storedCredential.rows[0]?.userId);
			expect(authResponse.body.counter).toBe(1);

			const counterCheck = await pgClient.query(
				'SELECT "counter" FROM "PasskeyCredential" WHERE "credentialId" = $1',
				[credentialId],
			);
			expect(counterCheck.rows[0]?.counter).toBe(1);
		});
	});
}
