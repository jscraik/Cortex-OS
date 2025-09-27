import { prismaAdapter as createPrismaAdapter } from 'better-auth/adapters/prisma';
import { execFile } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { prisma } from '../db/prisma-client.js';

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

		try {
			const result = await execFileAsync(
				prismaBinary,
				['db', 'push', '--schema', './prisma/schema.prisma'],
				{
					cwd: workspaceRoot,
					env: {
						...process.env,
						DATABASE_URL: connectionString,
					},
				},
			);
			console.error('[brAInwav][better-auth] prisma db push completed', {
				stdout: result.stdout,
				stderr: result.stderr,
			});
			initialized = true;
		} catch (error) {
			console.error('[brAInwav][better-auth] prisma db push failed', { error });
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
