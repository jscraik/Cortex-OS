import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import type { Prisma, PrismaClient } from '@prisma/client';

const execFileAsync = promisify(execFile);

const resolveDirectoryAnchors = () => {
	const currentDir = fileURLToPath(new URL('.', import.meta.url));
	const packageRoot = resolve(currentDir, '../..');
	const workspaceRoot = resolve(packageRoot, '../..');
	return { currentDir, packageRoot, workspaceRoot };
};

const resolvePrismaBinary = (packageRoot: string, workspaceRoot: string) => {
	const normalizedSuffix = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
	const candidates = [
		join(packageRoot, 'node_modules', '.bin', normalizedSuffix),
		join(workspaceRoot, 'node_modules', '.bin', normalizedSuffix),
	];

	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	return candidates.at(-1) ?? normalizedSuffix;
};

const ensurePrismaClientGenerated = (() => {
	let generated = false;
	return async () => {
		if (generated || process.env.CORTEX_SKIP_PRISMA_GENERATE === '1') {
			return;
		}

		const { packageRoot, workspaceRoot } = resolveDirectoryAnchors();
		const prismaBinary = resolvePrismaBinary(packageRoot, workspaceRoot);
		const schemaPath = join(workspaceRoot, 'prisma', 'schema.prisma');

		if (!existsSync(schemaPath)) {
			throw new Error(`Prisma schema not found at ${schemaPath}`);
		}

		try {
			await execFileAsync(prismaBinary, ['generate', '--schema', schemaPath], {
				cwd: packageRoot,
				env: {
					...process.env,
					PRISMA_HIDE_UPDATE_MESSAGE: '1',
				},
			});
			generated = true;
		} catch (error) {
			console.error('brAInwav Prisma client generation failed', { error });
			throw error;
		}
	};
})();

const isModuleNotFoundError = (error: unknown) => {
	if (!error || typeof error !== 'object') {
		return false;
	}

	const candidate = error as { code?: unknown; message?: unknown };
	const code = candidate.code;
	if (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') {
		return true;
	}

	if (typeof candidate.message === 'string') {
		return candidate.message.includes("Cannot find module '@prisma/client'");
	}

	return false;
};

type PrismaClientLogLevel = Prisma.LogLevel;

const resolveLogLevels = (): PrismaClientLogLevel[] => {
	if (process.env.NODE_ENV === 'development') {
		return ['query', 'info', 'warn', 'error'] as PrismaClientLogLevel[];
	}

	return ['warn', 'error'] as PrismaClientLogLevel[];
};

type PrismaClientSingleton = {
	readonly client: PrismaClient;
	readonly disconnect: () => Promise<void>;
	readonly isFallback: boolean;
};

type GlobalWithPrisma = typeof globalThis & {
	__cortexPrisma?: PrismaClientSingleton;
};

const globalForPrisma = globalThis as GlobalWithPrisma;
let activeSingleton: PrismaClientSingleton | undefined;

type PrismaClientConstructor = new (options?: Prisma.PrismaClientOptions) => PrismaClient;

const instantiatePrismaClient = async (): Promise<PrismaClient> => {
	const prismaModule = await import('@prisma/client');
	const prismaCtorCandidate = prismaModule.PrismaClient || prismaModule.default?.PrismaClient;
	const PrismaClientCtor = prismaCtorCandidate as unknown as PrismaClientConstructor | undefined;
	if (!PrismaClientCtor) {
		throw new Error('PrismaClient not found in import');
	}
	const datasourceUrl = process.env.DATABASE_URL;
	const log = resolveLogLevels();

	const baseConfig: Prisma.PrismaClientOptions = { log };
	const options = datasourceUrl
		? {
				...baseConfig,
				datasources: {
					db: { url: datasourceUrl },
				},
			}
		: baseConfig;

	return new PrismaClientCtor(options);
};

const loadPrismaClient = async (): Promise<PrismaClient | null> => {
	try {
		return await instantiatePrismaClient();
	} catch (error) {
		if (isModuleNotFoundError(error)) {
			try {
				await ensurePrismaClientGenerated();
				return await instantiatePrismaClient();
			} catch (retryError) {
				console.error('brAInwav Prisma client generation retry failed', { error: retryError });
				return null;
			}
		}

		console.warn('brAInwav Prisma client unavailable; using fallback stub', { error });
		return null;
	}
};

const noopAsync = async () => undefined;
const noopArray = async <T>() => [] as T[];
const noopNumber = async () => 0;
const noopNullable = async <T>() => null as T | null;
const proxyDelegateHandler: ProxyHandler<Record<PropertyKey, unknown>> = {
	get: (_target, prop): unknown => {
		if (prop === 'findMany') {
			return () => noopArray<never>();
		}
		if (prop === 'count') {
			return () => noopNumber();
		}
		if (prop === 'create' || prop === 'update') {
			return async (args?: { data?: unknown }) => args?.data ?? {};
		}
		if (prop === 'findUnique' || prop === 'findFirst' || prop === 'delete') {
			return () => noopNullable<never>();
		}
		if (prop === 'upsert' || prop === 'deleteMany' || prop === 'updateMany') {
			return () => noopArray<never>();
		}
		if (prop === 'aggregate' || prop === 'groupBy') {
			return async () => ({});
		}
		return () => noopNullable<never>();
	},
};

const createFallbackClient = (): PrismaClient => {
	const clientHandler: ProxyHandler<PrismaClient> = {
		get: (_target, prop): unknown => {
			if (prop === '$disconnect' || prop === '$connect') {
				return noopAsync;
			}
			if (prop === '$transaction') {
				return async (callback: unknown) => {
					if (typeof callback === 'function') {
						const delegate = new Proxy({}, proxyDelegateHandler) as unknown as Prisma.TransactionClient;
						const result = await Promise.resolve(
							(callback as (tx: Prisma.TransactionClient) => unknown)(delegate),
						);
						return result;
					}
					return [] as unknown[];
				};
			}
			return new Proxy({}, proxyDelegateHandler) as unknown;
		},
	};

	return new Proxy({} as PrismaClient, clientHandler);
};

const getSingleton = async (): Promise<PrismaClientSingleton> => {
        const existing = globalForPrisma.__cortexPrisma;

        if (existing) {
                activeSingleton = existing;
                return existing;
        }

        const client = await loadPrismaClient();
        if (client) {
                const entry: PrismaClientSingleton = {
                        client,
                        disconnect: async () => {
                                await client.$disconnect();
                                if (process.env.NODE_ENV !== 'production') {
                                        delete globalForPrisma.__cortexPrisma;
                                }
                                activeSingleton = undefined;
                        },
                        isFallback: false,
                };

                activeSingleton = entry;
                if (process.env.NODE_ENV !== 'production') {
                        globalForPrisma.__cortexPrisma = entry;
                }

                return entry;
        }

        const fallbackClient = createFallbackClient();
        const entry: PrismaClientSingleton = {
                client: fallbackClient,
                disconnect: async () => {
                        await noopAsync();
                        if (process.env.NODE_ENV !== 'production') {
                                delete globalForPrisma.__cortexPrisma;
                        }
                        activeSingleton = undefined;
                },
                isFallback: true,
        };

        activeSingleton = entry;
        if (process.env.NODE_ENV !== 'production') {
                globalForPrisma.__cortexPrisma = entry;
        }

        console.warn('brAInwav Prisma client unavailable; using fallback stub singleton');
        return entry;
};

const prismaSingleton = await getSingleton();

export const prisma = prismaSingleton.client;

export const getPrismaSingleton = async (): Promise<PrismaClientSingleton> => {
        if (!activeSingleton) {
                return await getSingleton();
        }
        return activeSingleton;
};

export const isPrismaFallback = async (): Promise<boolean> => {
        const singleton = await getPrismaSingleton();
        return singleton.isFallback;
};

export const disconnectPrisma = async () => {
        const singleton = await getPrismaSingleton();
        await singleton.disconnect();
};
