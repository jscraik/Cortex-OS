import { Client } from 'pg';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getContainerRuntimeDecision, logMissingRuntimeWarning } from '../helpers/postgres';

const skipFlagExplicit = process.env.CORTEX_SKIP_AUTH_POSTGRES_TEST === '1';
const runtimeDecision = getContainerRuntimeDecision();

if (!runtimeDecision.available && !skipFlagExplicit) {
	logMissingRuntimeWarning('auth-features');
}

const skipFlag = skipFlagExplicit || !runtimeDecision.available;
const suite = skipFlag ? describe.skip : describe;

type PostgresError = Error & { code?: string };

type LoginResult = {
	token: string;
	userId: string;
};

suite('Auth feature persistence', () => {
	let container: { stop: () => Promise<void>; getConnectionUri: () => string } | undefined;
	let connectionString = '';
	let pgClient: Client | undefined;

	const resetApp = async () => {
		vi.resetModules();
		const mod = await import('../../src/server.js');
		return mod.app;
	};

	const ensureClient = () => {
		if (!pgClient) {
			throw new Error('Postgres client not initialised');
		}
		return pgClient;
	};

	const truncateAuthTables = async () => {
		if (!pgClient) {
			return;
		}

		const truncateStatement =
			'TRUNCATE TABLE "AuthAuditLog", "PasskeyCredential", "TwoFactorSecret", "Verification", "Account", "Session", "User" CASCADE';

		try {
			await pgClient.query(truncateStatement);
		} catch (error) {
			const { code } = error as PostgresError;
			if (code !== '42P01') {
				throw error;
			}
		}
	};

	const startContainer = async () => {
		const testcontainers: Record<string, unknown> = await import('@testcontainers/postgresql');
		const ContainerCtor = (testcontainers.PostgreSqlContainer ??
			testcontainers.PostgreSQLContainer) as
			| undefined
			| (new () => {
					withDatabase: (name: string) => unknown;
					withUsername: (username: string) => unknown;
					withPassword: (password: string) => unknown;
					start: () => Promise<{ stop: () => Promise<void>; getConnectionUri: () => string }>;
			  });

		if (!ContainerCtor) {
			throw new Error('PostgreSqlContainer implementation unavailable');
		}

		const instance = new ContainerCtor();
		const withDb = instance.withDatabase('auth_db') as {
			withUsername: (username: string) => unknown;
		};
		const withUser = withDb.withUsername('auth_user') as {
			withPassword: (password: string) => unknown;
		};
		const withPass = withUser.withPassword('auth_pass') as {
			start: () => Promise<{ stop: () => Promise<void>; getConnectionUri: () => string }>;
		};
		return withPass.start();
	};

	const registerAndLogin = async (
		appInstance: Awaited<ReturnType<typeof resetApp>>,
		email: string,
	) => {
		await request(appInstance)
			.post('/auth/register')
			.send({
				email,
				password: 'FeaturePass123!',
				name: 'Feature User',
			})
			.expect(201);

		const loginResponse = await request(appInstance)
			.post('/auth/login')
			.send({
				email,
				password: 'FeaturePass123!',
			})
			.expect(200);

		const token: string | undefined = loginResponse.body?.session?.token;
		const userId: string | undefined = loginResponse.body?.user?.id;

		if (!token || !userId) {
			throw new Error('Login response missing token or user identifier');
		}

		return { token, userId } satisfies LoginResult;
	};

	const fetchSessionSummaries = async (
		appInstance: Awaited<ReturnType<typeof resetApp>>,
		token: string,
	): Promise<Array<{ id: string; token: string }>> => {
		const response = await request(appInstance)
			.get('/api/sessions')
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const sessions = Array.isArray(response.body?.sessions) ? response.body.sessions : [];

		const normalized = sessions.map((session: Record<string, unknown>) => ({
			id: typeof session.id === 'string' ? session.id : '',
			token: typeof session.token === 'string' ? session.token : '',
		}));

		return normalized.filter(
			(session: { id: string; token: string }) => session.id !== '' && session.token !== '',
		);
	};

	beforeAll(async () => {
		process.env.NODE_ENV = 'test';
		process.env.BETTER_AUTH_SECRET = 'test-secret';
		process.env.BETTER_AUTH_URL = 'http://localhost:3001';

		container = await startContainer();
		connectionString = container.getConnectionUri();
		process.env.DATABASE_URL = connectionString;

		pgClient = new Client({ connectionString });
		await pgClient.connect();
	});

	afterAll(async () => {
		await truncateAuthTables();
		if (pgClient) {
			await pgClient.end();
		}
		if (container) {
			await container.stop();
		}
	});

	beforeEach(async () => {
		await truncateAuthTables();
	});

	afterEach(async () => {
		await truncateAuthTables();
	});

	it('persists profile updates, session revocation, and security features to Postgres', async () => {
		const appInstance = await resetApp();
		const email = 'features@example.com';
		const { token, userId } = await registerAndLogin(appInstance, email);

		const updatedName = 'Feature Updated';
		await request(appInstance)
			.put('/api/me')
			.set('Authorization', `Bearer ${token}`)
			.send({
				name: updatedName,
				image: 'https://example.com/avatar.png',
			})
			.expect(200);

		const client = ensureClient();
		const profileRows = await client.query('SELECT name FROM "User" WHERE id = $1', [userId]);
		expect(profileRows.rows.at(0)?.name).toBe(updatedName);

		const secondLogin = await request(appInstance)
			.post('/auth/login')
			.send({
				email,
				password: 'FeaturePass123!',
			})
			.expect(200);

		const sessions = await fetchSessionSummaries(appInstance, token);
		const sessionToRevoke = sessions.find(
			(session) => session.token === secondLogin.body?.session?.token,
		);
		if (!sessionToRevoke) {
			throw new Error('Expected a secondary session to revoke');
		}

		await request(appInstance)
			.delete(`/api/sessions/${sessionToRevoke.id}`)
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const remainingSessions = await client.query('SELECT id FROM "Session" WHERE "userId" = $1', [
			userId,
		]);
		expect(remainingSessions.rowCount ?? 0).toBeGreaterThanOrEqual(1);
		const sessionRows = (remainingSessions.rows ?? []) as Array<{ id: string }>;
		expect(sessionRows.some((row) => row.id === sessionToRevoke.id)).toBe(false);

		await request(appInstance)
			.post('/api/2fa/enable')
			.set('Authorization', `Bearer ${token}`)
			.send({ password: 'FeaturePass123!' })
			.expect(200);

		const twoFactorRows = await client.query(
			'SELECT "userId" FROM "TwoFactorSecret" WHERE "userId" = $1',
			[userId],
		);
		expect(twoFactorRows.rowCount ?? 0).toBeGreaterThanOrEqual(1);

		await request(appInstance)
			.post('/api/passkeys/register')
			.set('Authorization', `Bearer ${token}`)
			.send({ name: 'Feature Credential' })
			.expect(200);

		const passkeyRows = await client.query(
			'SELECT "userId" FROM "PasskeyCredential" WHERE "userId" = $1',
			[userId],
		);
		expect(passkeyRows.rowCount ?? 0).toBeGreaterThanOrEqual(1);

		const auditRows = await client.query('SELECT message FROM "AuthAuditLog" WHERE "userId" = $1', [
			userId,
		]);
		expect(auditRows.rowCount ?? 0).toBeGreaterThanOrEqual(3);
		const auditRecords = (auditRows.rows ?? []) as Array<{ message?: unknown }>;
		expect(
			auditRecords.every(
				(record) => typeof record.message === 'string' && record.message.includes('brAInwav'),
			),
		).toBe(true);
	});
});
