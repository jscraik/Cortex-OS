import { Client } from 'pg';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const shouldSkip = process.env.CORTEX_SKIP_AUTH_POSTGRES_TEST === '1';
const suite = shouldSkip ? describe.skip : describe;

type PostgresError = Error & { code?: string };

suite('Auth persistence with Postgres', () => {
	let container: { stop: () => Promise<void>; getConnectionUri: () => string } | undefined;
	let connectionString = '';
	let pgClient: Client | undefined;

	const resetApp = async () => {
		vi.resetModules();
		const mod = await import('../../src/server.js');
		return mod.app;
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

	beforeAll(async () => {
		process.env.NODE_ENV = 'test';
		process.env.BETTER_AUTH_SECRET = 'test-secret';
		process.env.BETTER_AUTH_URL = 'http://localhost:3001';

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

		const builder = new ContainerCtor();
		const configured = (
			builder.withDatabase('auth_db') as {
				withUsername: (username: string) => unknown;
			}
		).withUsername('auth_user') as { withPassword: (password: string) => unknown };
		const withPassword = configured.withPassword('auth_pass') as {
			start: () => Promise<{ stop: () => Promise<void>; getConnectionUri: () => string }>;
		};
		container = await withPassword.start();

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

	it('persists user and session across app restarts', async () => {
		const initialApp = await resetApp();

		const email = 'persist@example.com';

		await request(initialApp)
			.post('/auth/register')
			.send({
				email,
				password: 'PersistPass123!',
				name: 'Persist User',
			})
			.expect(201);

		const loginResponse = await request(initialApp)
			.post('/auth/login')
			.send({
				email,
				password: 'PersistPass123!',
			})
			.expect(200);

		const token: string | undefined = loginResponse.body?.session?.token;
		expect(token).toBeDefined();

		if (!pgClient) {
			throw new Error('Postgres client not initialised');
		}
		const userRows = await pgClient.query('SELECT email FROM "User" WHERE email = $1', [email]);
		expect(userRows.rowCount ?? 0).toBeGreaterThanOrEqual(1);

		const restartedApp = await resetApp();

		await request(restartedApp).get('/api/me').set('Authorization', `Bearer ${token}`).expect(200);
	});
});
