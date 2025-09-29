import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import type {
        DatabaseHealthConfig,
        DatabaseHealthResult,
        LocalMemoryHealthConfig,
        MemoryBackendKind,
        PrismaHealthConfig,
        SqliteHealthConfig,
} from '../types.js';

const BRAND_PREFIX = 'brAInwav';

export async function checkDatabaseHealth(config: DatabaseHealthConfig): Promise<DatabaseHealthResult> {
        const startedAt = Date.now();
        switch (config.backend) {
                case 'sqlite':
                        return finalizeResult('sqlite', startedAt, await checkSqliteHealth(config.sqlite));
                case 'prisma':
                        return finalizeResult('prisma', startedAt, await checkPrismaHealth(config.prisma));
                case 'local-memory':
                        return finalizeResult(
                                'local-memory',
                                startedAt,
                                await checkLocalMemoryHealth(config.localMemory),
                        );
                default:
                        return finalizeResult(config.backend, startedAt, {
                                healthy: false,
                                error: `${BRAND_PREFIX} unsupported backend: ${config.backend as string}`,
                        });
        }
}

function finalizeResult(
        backend: MemoryBackendKind,
        startedAt: number,
        outcome: { healthy: boolean; error?: string },
): DatabaseHealthResult {
        return {
                backend,
                healthy: outcome.healthy,
                error: outcome.error,
                checkedAt: new Date().toISOString(),
                latencyMs: Date.now() - startedAt,
        };
}

async function checkSqliteHealth(config?: SqliteHealthConfig): Promise<{ healthy: boolean; error?: string }> {
        if (!config?.connectionString) {
                return {
                        healthy: false,
                        error: `${BRAND_PREFIX} sqlite connection string missing`,
                };
        }

        try {
                const options: Database.Options & { uri?: boolean } = {
                        readonly: config.readonly ?? false,
                        fileMustExist: !config.connectionString.startsWith(':memory:'),
                };
                if (config.uri || config.connectionString.startsWith('file:')) {
                        options.uri = true;
                }

                const db = new Database(config.connectionString, options);
                try {
                        db.prepare('SELECT 1').get();
                        return { healthy: true };
                } finally {
                        db.close();
                }
        } catch (error) {
                return {
                        healthy: false,
                        error: formatError('sqlite', error),
                };
        }
}

async function checkPrismaHealth(config?: PrismaHealthConfig): Promise<{ healthy: boolean; error?: string }> {
        if (!config?.connectionString) {
                return {
                        healthy: false,
                        error: `${BRAND_PREFIX} prisma connection string missing`,
                };
        }

        const prisma = new PrismaClient({
                datasources: {
                        db: {
                                url: config.connectionString,
                        },
                },
        });

        try {
                await prisma.$connect();
                await prisma.$queryRaw`SELECT 1`;
                return { healthy: true };
        } catch (error) {
                return {
                        healthy: false,
                        error: formatError('prisma', error),
                };
        } finally {
                await prisma.$disconnect().catch(() => undefined);
        }
}

async function checkLocalMemoryHealth(
        config?: LocalMemoryHealthConfig,
): Promise<{ healthy: boolean; error?: string }> {
        if (!config?.baseUrl) {
                return {
                        healthy: false,
                        error: `${BRAND_PREFIX} local-memory base URL missing`,
                };
        }

        const timeout = config.timeoutMs ?? 1500;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
                const endpoint = new URL(config.healthPath ?? '/health', config.baseUrl);
                const response = await fetch(endpoint, {
                        method: 'GET',
                        headers: config.apiKey
                                ? {
                                          Authorization: `Bearer ${config.apiKey}`,
                                  }
                                : undefined,
                        cache: 'no-store',
                        signal: controller.signal,
                });

                if (!response.ok) {
                        return {
                                healthy: false,
                                error: `${BRAND_PREFIX} local-memory health check failed: HTTP ${response.status}`,
                        };
                }

                return { healthy: true };
        } catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                return {
                        healthy: false,
                        error: `${BRAND_PREFIX} local-memory health check failed: ${reason}`,
                };
        } finally {
                clearTimeout(timer);
        }
}

function formatError(backend: 'sqlite' | 'prisma', error: unknown): string {
        const message = error instanceof Error ? error.message : String(error);
        return `${BRAND_PREFIX} ${backend} health check failed: ${message}`;
}
