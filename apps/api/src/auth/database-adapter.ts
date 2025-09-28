import { execFile } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { prismaAdapter as createPrismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '../db/prisma-client.js';
import { prepareMigrationArtifacts } from './schema-guard.js';

const execFileAsync = promisify(execFile);

type PrismaAdapterFactory = ReturnType<typeof createPrismaAdapter>;
type PrismaAdapter = ReturnType<PrismaAdapterFactory>;

const resolveWorkspaceRoot = () => {
	const currentDir = fileURLToPath(new URL('.', import.meta.url));
	return resolve(currentDir, '../../../..');
};

const resolvePrismaBinary = (workspaceRoot: string) => {
	const base = join(workspaceRoot, 'node_modules', '.bin', 'prisma');
	return process.platform === 'win32' ? `${base}.cmd` : base;
};

const ensureDatabaseSchema = (() => {
	let initialized = false;
	return async () => {
		if (initialized || process.env.CORTEX_SKIP_PRISMA_PUSH === '1') {
			return;
		}

		const connectionString = process.env.DATABASE_URL;
		if (!connectionString) {
			console.warn('[brAInwav][better-auth] DATABASE_URL missing – skipping prisma db push');
			return;
		}

		const workspaceRoot = resolveWorkspaceRoot();
		const prismaBinary = resolvePrismaBinary(workspaceRoot);
		const envWithDatabase = {
			...process.env,
			DATABASE_URL: connectionString,
		} satisfies NodeJS.ProcessEnv;
		const migrationArtifacts = await prepareMigrationArtifacts({
			prismaBinary,
			workspaceRoot,
			connectionString,
			env: envWithDatabase,
		});

		const command =
			migrationArtifacts.pendingMigrations.length > 0
				? ['migrate', 'deploy', '--schema', './prisma/schema.prisma']
				: ['db', 'push', '--schema', './prisma/schema.prisma'];

		try {
			const result = await execFileAsync(prismaBinary, command, {
				cwd: workspaceRoot,
				env: envWithDatabase,
			});
			console.info('[brAInwav][better-auth] prisma schema synchronization completed', {
				stdout: result.stdout,
				stderr: result.stderr,
				pendingMigrations: migrationArtifacts.pendingMigrations,
				forwardScript: migrationArtifacts.forwardScriptPath,
				rollbackScript: migrationArtifacts.rollbackScriptPath,
			});
			initialized = true;
		} catch (error) {
			console.error('[brAInwav][better-auth] prisma schema synchronization failed', {
				error: formatAdapterError(error),
				pendingMigrations: migrationArtifacts.pendingMigrations,
				rollbackScript: migrationArtifacts.rollbackScriptPath,
			});
			throw error;
		}
	};
})();

await ensureDatabaseSchema();

const enablePrismaDebug = process.env.BRAINWAV_DEBUG_AUTH === '1';

const prismaFactory = createPrismaAdapter(prisma, {
	provider: 'postgresql',
	transaction: true,
	debugLogs: enablePrismaDebug ? true : undefined,
});

const formatAdapterError = (error: unknown) => {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack,
		};
	}

	return { value: error };
};

const captureAdapterFailure = (phase: string, error: unknown, meta?: Record<string, unknown>) => {
	const payload = {
		phase,
		error: formatAdapterError(error),
		meta,
	};
	(globalThis as Record<string, unknown>).__brAInwavBetterAuthAdapterFailure = payload;
	console.error('[brAInwav][better-auth] adapter failure captured', payload);
};

const wrapAdapter = (adapter: PrismaAdapter): PrismaAdapter => {
	const handler: ProxyHandler<PrismaAdapter> = {
		get(target, prop, receiver) {
			const value = Reflect.get(target, prop, receiver);
			if (typeof value !== 'function') {
				return value;
			}

			return async (...args: unknown[]) => {
				try {
					return await Reflect.apply(value, target, args);
				} catch (error) {
					captureAdapterFailure('method', error, {
						operation: String(prop),
						args,
					});
					throw error;
				}
			};
		},
	};

	return new Proxy(adapter, handler);
};

export const createBetterAuthPrismaAdapter = (): PrismaAdapterFactory => {
	return (options) => {
		delete (globalThis as Record<string, unknown>).__brAInwavBetterAuthAdapterFailure;
		try {
			const adapter = prismaFactory(options);
			return wrapAdapter(adapter);
		} catch (error) {
			captureAdapterFailure('factory', error, {
				optionKeys: options ? Object.keys(options) : [],
			});
			throw error;
		}
	};
};
