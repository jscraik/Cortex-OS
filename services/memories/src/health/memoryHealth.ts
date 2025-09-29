import { performance } from 'node:perf_hooks';
import sqlite3 from 'sqlite3';

export type MemoryHealthStatus = 'ok' | 'error';

export interface MemoryBackendHealth {
        backendId: string;
        status: MemoryHealthStatus;
        latencyMs: number;
        message?: string;
}

export interface MemoryBackendMetadata {
        backendId: string;
        details: Record<string, unknown>;
}

export interface MemoryBackend {
        readonly id: string;
        ping(): Promise<MemoryBackendHealth>;
        describe(): MemoryBackendMetadata;
}

export class MemoryBackendError extends Error {
        constructor(message: string) {
                super(`brAInwav memories backend error: ${message}`);
                this.name = 'MemoryBackendError';
        }
}

export interface PrismaClientLike {
        $connect(): Promise<void>;
        $disconnect(): Promise<void>;
}

export class SqliteMemoryBackend implements MemoryBackend {
        readonly id = 'sqlite';

        constructor(private readonly filePath: string) {
                if (!filePath) {
                        throw new MemoryBackendError('missing SQLite file path');
                }
        }

        async ping(): Promise<MemoryBackendHealth> {
                const started = performance.now();
                return new Promise<MemoryBackendHealth>((resolve, reject) => {
                        const database = new sqlite3.Database(this.filePath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (error) => {
                                if (error) {
                                        reject(new MemoryBackendError(`sqlite ping failed: ${error.message}`));
                                        return;
                                }

                                database.get('SELECT 1 as health_check', (queryError) => {
                                        database.close((closeError) => {
                                                if (queryError) {
                                                        reject(new MemoryBackendError(`sqlite health query failed: ${queryError.message}`));
                                                        return;
                                                }

                                                if (closeError) {
                                                        reject(new MemoryBackendError(`sqlite close failed: ${closeError.message}`));
                                                        return;
                                                }

                                                resolve({
                                                        backendId: this.id,
                                                        status: 'ok',
                                                        latencyMs: performance.now() - started,
                                                });
                                        });
                                });
                        });
                });
        }

        describe(): MemoryBackendMetadata {
                return {
                        backendId: this.id,
                        details: {
                                filePath: this.filePath,
                                durable: true,
                        },
                };
        }
}

export class PrismaMemoryBackend implements MemoryBackend {
        readonly id = 'prisma';

        constructor(private readonly clientFactory: () => PrismaClientLike) {}

        async ping(): Promise<MemoryBackendHealth> {
                const started = performance.now();
                const client = this.clientFactory();
                try {
                        await client.$connect();
                        const latencyMs = performance.now() - started;
                        return {
                                backendId: this.id,
                                status: 'ok',
                                latencyMs,
                        };
                } catch (error) {
                        throw new MemoryBackendError(`prisma ping failed: ${(error as Error).message}`);
                } finally {
                        try {
                                await client.$disconnect();
                        } catch (disconnectError) {
                                // Intentionally ignore disconnect failures; they should not mask the original error.
                        }
                }
        }

        describe(): MemoryBackendMetadata {
                return {
                        backendId: this.id,
                        details: {
                                client: 'prisma',
                        },
                };
        }
}

export class LocalMemoryBackend implements MemoryBackend {
        readonly id = 'local-memory';
        private readonly store: Map<string, unknown>;

        constructor(seed?: Map<string, unknown>) {
                this.store = seed ?? new Map();
        }

        async ping(): Promise<MemoryBackendHealth> {
                const started = performance.now();
                this.store.set('health:lastPing', new Date().toISOString());
                return {
                        backendId: this.id,
                        status: 'ok',
                        latencyMs: performance.now() - started,
                };
        }

        describe(): MemoryBackendMetadata {
                return {
                        backendId: this.id,
                        details: {
                                entries: this.store.size,
                                durable: false,
                        },
                };
        }
}

export class MemoryHealthChecker {
        constructor(private readonly backends: Map<string, MemoryBackend>, private readonly activeBackendId: string) {
                if (!backends.size) {
                        throw new MemoryBackendError('no memories backends registered');
                }

                if (!backends.has(activeBackendId)) {
                        throw new MemoryBackendError(`unknown active backend ${activeBackendId}`);
                }
        }

        get activeBackend(): string {
                return this.activeBackendId;
        }

        async checkActiveBackend(): Promise<MemoryBackendHealth> {
                const backend = this.backends.get(this.activeBackendId);
                if (!backend) {
                        throw new MemoryBackendError(`backend ${this.activeBackendId} is not registered`);
                }

                return backend.ping();
        }

        describeActiveBackend(): MemoryBackendMetadata {
                const backend = this.backends.get(this.activeBackendId);
                if (!backend) {
                        throw new MemoryBackendError(`backend ${this.activeBackendId} is not registered`);
                }

                return backend.describe();
        }
}
