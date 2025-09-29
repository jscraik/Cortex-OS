import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createMemoriesService } from '../../services/memories/src/app.js';
import type { MemoriesServiceConfig } from '../../services/memories/src/app.js';
import type { Server } from 'http';

type Scenario = {
        name: string;
        config: MemoriesServiceConfig;
};

const scenarios: Scenario[] = [
        {
                name: 'sqlite backend responds with unhealthy state when database unreachable',
                config: {
                        backend: 'sqlite',
                        sqlite: {
                                connectionString: 'file:/compose/sqlite/invalid.db?mode=ro',
                                uri: true,
                                readonly: true,
                        },
                },
        },
        {
                name: 'prisma backend responds with unhealthy state for invalid postgres target',
                config: {
                        backend: 'prisma',
                        prisma: {
                                connectionString: 'postgresql://compose:compose@127.0.0.1:65434/compose?connect_timeout=1',
                        },
                },
        },
        {
                name: 'local-memory backend reports unhealthy when remote API offline',
                config: {
                        backend: 'local-memory',
                        localMemory: {
                                baseUrl: 'http://127.0.0.1:65535',
                                timeoutMs: 250,
                        },
                },
        },
];

describe('memories service docker matrix simulation', () => {
        let server: Server | undefined;

        afterEach(async () => {
                if (server) {
                        await new Promise<void>((resolve) => server?.close(() => resolve()));
                        server = undefined;
                }
        });

        it.each(scenarios)('$name', async ({ config }) => {
                const app = createMemoriesService(config);
                server = app.listen();
                const agent = request(server);

                const healthResponse = await agent.get('/health');
                expect(healthResponse.body.brand).toBe('brAInwav');
                expect(healthResponse.body.backend).toBe(config.backend);
                expect(healthResponse.status).toBe(503);

                const statsResponse = await agent.get('/memories/stats');
                expect(statsResponse.status).toBe(200);
                expect(statsResponse.body.brand).toBe('brAInwav');
                expect(statsResponse.body.backend.kind).toBe(config.backend);
                expect(statsResponse.body.backend.healthy).toBe(false);
        });
});
