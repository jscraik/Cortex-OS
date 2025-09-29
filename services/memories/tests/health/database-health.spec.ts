import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterAll, describe, expect, it } from 'vitest';
import {
        LocalMemoryBackend,
        MemoryBackendError,
        MemoryHealthChecker,
        PrismaMemoryBackend,
        SqliteMemoryBackend,
        type PrismaClientLike,
} from '../../src/health/memoryHealth.js';

describe('Memories database health checks', () => {
        const tempDirectory = mkdtempSync(join(tmpdir(), 'memories-health-'));
        afterAll(() => {
                rmSync(tempDirectory, { recursive: true, force: true });
        });

        it('validates sqlite backend connectivity', async () => {
                const sqliteFile = join(tempDirectory, 'memories.db');
                const sqliteBackend = new SqliteMemoryBackend(sqliteFile);
                const checker = new MemoryHealthChecker(new Map([[sqliteBackend.id, sqliteBackend]]), sqliteBackend.id);

                const result = await checker.checkActiveBackend();
                expect(result.backendId).toBe('sqlite');
                expect(result.status).toBe('ok');
        });

        it('fails sqlite backend when file path is invalid', async () => {
                const sqliteBackend = new SqliteMemoryBackend('/non-existent-directory/memories.db');
                const checker = new MemoryHealthChecker(new Map([[sqliteBackend.id, sqliteBackend]]), sqliteBackend.id);

                await expect(checker.checkActiveBackend()).rejects.toThrowError(MemoryBackendError);
        });

        it('validates prisma backend using injected client', async () => {
                const prismaBackend = new PrismaMemoryBackend(() => ({
                        async $connect() {},
                        async $disconnect() {},
                } satisfies PrismaClientLike));
                const checker = new MemoryHealthChecker(new Map([[prismaBackend.id, prismaBackend]]), prismaBackend.id);

                const result = await checker.checkActiveBackend();
                expect(result.backendId).toBe('prisma');
                expect(result.status).toBe('ok');
        });

        it('surfaces prisma connectivity failures', async () => {
                const prismaBackend = new PrismaMemoryBackend(() => ({
                        async $connect() {
                                throw new Error('connection refused');
                        },
                        async $disconnect() {},
                } satisfies PrismaClientLike));
                const checker = new MemoryHealthChecker(new Map([[prismaBackend.id, prismaBackend]]), prismaBackend.id);

                await expect(checker.checkActiveBackend()).rejects.toThrowError(MemoryBackendError);
        });

        it('reports local-memory backend health', async () => {
                const backend = new LocalMemoryBackend();
                const checker = new MemoryHealthChecker(new Map([[backend.id, backend]]), backend.id);

                const result = await checker.checkActiveBackend();
                expect(result.backendId).toBe('local-memory');
                expect(result.status).toBe('ok');
        });
});
