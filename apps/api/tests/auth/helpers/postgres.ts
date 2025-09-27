import { Client } from 'pg';
import {
	getContainerRuntimeDecision,
	logMissingRuntimeWarning,
} from '../../helpers/container-runtime';

export const AUTH_HOOK_TIMEOUT_MS = 120_000;

export type AuthDbHandle = {
	client: Client;
	stop: () => Promise<void>;
	connectionString: string;
};

const truncateStatement =
	'TRUNCATE TABLE "AuthAuditLog", "PasskeyCredential", "TwoFactorSecret", "Verification", "Account", "Session", "User" CASCADE';

export const shouldSkipAuthDb = (scope: string) => {
	const skipExplicitly = process.env.CORTEX_SKIP_AUTH_POSTGRES_TEST === '1';
	const runtimeDecision = getContainerRuntimeDecision();
	if (!runtimeDecision.available && !skipExplicitly) {
		logMissingRuntimeWarning(scope);
	}
	return skipExplicitly || !runtimeDecision.available;
};

const MAX_CONNECTION_ATTEMPTS = 60;
const CONNECTION_RETRY_DELAY_MS = 1_000;

const connectWithRetry = async (connectionString: string): Promise<Client> => {
	let lastError: unknown;
	for (let attempt = 1; attempt <= MAX_CONNECTION_ATTEMPTS; attempt += 1) {
		console.info(
			`[brAInwav][auth-tests] Connecting to Postgres (attempt ${attempt}/${MAX_CONNECTION_ATTEMPTS})`,
		);
		const client = new Client({ connectionString });
		try {
			await client.connect();
			console.info('[brAInwav][auth-tests] Connected to Postgres test container');
			return client;
		} catch (error) {
			lastError = error;
			await client.end().catch(() => undefined);
			const hasAttemptsRemaining = attempt < MAX_CONNECTION_ATTEMPTS;
			if (!hasAttemptsRemaining) {
				throw error;
			}
			await new Promise((resolve) => {
				setTimeout(resolve, CONNECTION_RETRY_DELAY_MS);
			});
		}
	}
	throw lastError instanceof Error
		? lastError
		: new Error('brAInwav Postgres connection failed without error detail');
};

export const startAuthDb = async (): Promise<AuthDbHandle> => {
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
		builder.withDatabase('auth_db') as { withUsername: (username: string) => unknown }
	).withUsername('auth_user') as { withPassword: (password: string) => unknown };
	const withPassword = configured.withPassword('auth_pass') as {
		start: () => Promise<{ stop: () => Promise<void>; getConnectionUri: () => string }>;
	};

	const container = await withPassword.start();
	const connectionString = container.getConnectionUri();
	const normalizedUrl = new URL(connectionString);
	normalizedUrl.hostname = '127.0.0.1';
	const normalizedConnectionString = normalizedUrl.toString();
	const client = await connectWithRetry(normalizedConnectionString);

	return {
		client,
		connectionString: normalizedConnectionString,
		stop: container.stop.bind(container),
	};
};

export const truncateAuthTables = async (client: Client) => {
	try {
		await client.query(truncateStatement);
	} catch (error) {
		const pgError = error as { code?: string };
		if (pgError?.code !== '42P01') {
			throw error;
		}
	}
};
