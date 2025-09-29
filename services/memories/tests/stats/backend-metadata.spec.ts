import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createMemoriesService } from '../../../src/app.js';
import type { MemoriesServiceConfig } from '../../../src/app.js';
import type { Server } from 'http';

const scenarios: Array<{
        name: string;
        config: MemoriesServiceConfig;
        expectedBackend: string;
}> = [
        {
                name: 'sqlite backend exposes stats metadata',
                config: {
                        backend: 'sqlite',
                        sqlite: {
                                connectionString: 'file:/still/missing.db?mode=ro',
                                uri: true,
                                readonly: true,
                        },
                },
                expectedBackend: 'sqlite',
        },
        {
                name: 'prisma backend exposes stats metadata',
                config: {
                        backend: 'prisma',
                        prisma: {
                                connectionString: 'postgresql://invalid:invalid@localhost:65433/invalid?connect_timeout=1',
                        },
                },
                expectedBackend: 'prisma',
        },
        {
                name: 'local-memory backend exposes stats metadata',
                config: {
                        backend: 'local-memory',
                        localMemory: {
                                baseUrl: 'http://127.0.0.1:65535',
                                timeoutMs: 250,
                        },
                },
                expectedBackend: 'local-memory',
        },
];

describe('memories stats metadata', () => {
        let server: Server | undefined;

        afterEach(async () => {
                if (server) {
                        await new Promise<void>((resolve) => server?.close(() => resolve()));
                        server = undefined;
                }
        });

        it.each(scenarios)('$name', async ({ config, expectedBackend }) => {
                const app = createMemoriesService(config);
                server = app.listen();
                const agent = request(server);

                const response = await agent.get('/memories/stats');
                expect(response.status).toBe(200);
                expect(response.body.brand).toBe('brAInwav');
                expect(response.body.backend.kind).toBe(expectedBackend);
                expect(response.body.backend.healthy).toBeTypeOf('boolean');
        });
});
