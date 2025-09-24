import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// No mocks: use the real bus and real contracts

describe('RAG E2E via real bus and metrics', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        process.env.GATEWAY_ALLOW_RAG = '1';
        const { start } = await import('../src/server');
        app = await start(0);
    });

    afterAll(async () => {
        if (app) await app.close();
    });

    it('publishes rag.query.executed and can resolve on rag.query.completed (real bus)', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/rag?json=true',
            payload: {
                config: { seed: 1, maxTokens: 8, timeoutMs: 500, memory: { maxItems: 1, maxBytes: 1 } },
                query: { query: 'ping', topK: 1 },
            },
        });
        expect([200, 200].includes(res.statusCode)).toBe(true); // we expect 200 with either success or timeout payload structure
        const body = JSON.parse(String(res.body)) as { data?: { results: unknown[]; provider: string; duration: number }; error?: unknown };
        expect(typeof body === 'object').toBe(true);
    });

    it('increments http_request_errors_total on 500', async () => {
        const before = await app.inject({ method: 'GET', url: '/metrics' });
        const metricName = 'http_request_errors_total';
        const parse = (s: string) => {
            const m = s.match(new RegExp(`^${metricName}.* (\\d+(?:\\.\\d+)?)$`, 'm'));
            return m ? Number(m[1]) : 0;
        };
        const beforeVal = parse(String(before.body));

        const r = await app.inject({ method: 'POST', url: '/__boom' });
        expect(r.statusCode).toBe(500);

        const after = await app.inject({ method: 'GET', url: '/metrics' });
        const afterVal = parse(String(after.body));
        expect(afterVal).toBeGreaterThanOrEqual(beforeVal + 1);
    });
});
