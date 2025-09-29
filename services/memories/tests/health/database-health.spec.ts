import { describe, expect, it } from 'vitest';
import { checkDatabaseHealth } from '../../../src/health/database.js';

const matrix = [
        {
                name: 'sqlite backend reports unhealthy for missing file',
                config: {
                        backend: 'sqlite' as const,
                        sqlite: {
                                connectionString: 'file:/does/not/exist.db?mode=ro',
                                uri: true,
                                readonly: true,
                        },
                },
        },
        {
                name: 'prisma backend reports unhealthy for bogus connection string',
                config: {
                        backend: 'prisma' as const,
                        prisma: {
                                connectionString: 'postgresql://invalid:invalid@127.0.0.1:65432/invalid?connect_timeout=1',
                        },
                },
        },
        {
                name: 'local-memory backend reports unhealthy when URL unreachable',
                config: {
                        backend: 'local-memory' as const,
                        localMemory: {
                                baseUrl: 'http://127.0.0.1:65535',
                                timeoutMs: 250,
                        },
                },
        },
];

describe('memories service database health checks', () => {
        it.each(matrix)('$name', async ({ config }) => {
                const result = await checkDatabaseHealth(config);
                expect(result.healthy).toBe(false);
                expect(result.error).toMatch(/brAInwav/);
        });
});
