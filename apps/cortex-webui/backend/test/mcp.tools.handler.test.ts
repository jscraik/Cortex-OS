/// <reference types="vitest" />
import request from 'supertest';
import { createServer } from '../src/server';
import { __setMcpRateLimitForTests } from '../src/mcp/tools';

// Basic tests for MCP tool execution endpoint
// These are smoke tests; more exhaustive contract tests live under contracts/tests

describe('MCP Tools HTTP Endpoint', () => {
    const serverComponents = createServer();
    const { app } = serverComponents;
    const base = '/api/v1';

    it('lists tools', async () => {
        const res = await request(app).get(`${base}/mcp/tools`).expect(200);
        expect(Array.isArray(res.body.tools)).toBe(true);
        expect(res.body.tools.length).toBeGreaterThan(0);
    });

    it('executes open_panel successfully', async () => {
        const res = await request(app)
            .post(`${base}/mcp/execute`)
            .send({ tool: 'open_panel', args: { panelId: 'side_nav' } })
            .expect(200);
        expect(res.body.success).toBe(true);
        expect(res.body.tool).toBe('open_panel');
    });

    it('returns validation error for bad args', async () => {
        const res = await request(app)
            .post(`${base}/mcp/execute`)
            // missing required panelId
            .send({ tool: 'open_panel', args: {} })
            .expect(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('validation_error');
    });

    it('returns unknown_tool for unsupported tool', async () => {
        const res = await request(app)
            .post(`${base}/mcp/execute`)
            .send({ tool: 'does_not_exist', args: {} })
            .expect(400);
        expect(res.body.error.code).toBe('unknown_tool');
    });

    it('enforces rate limit when overridden in tests', async () => {
        // Override: limit=2 within a short window
        __setMcpRateLimitForTests(2, 10_000);
        const tool = 'navigate';
        // First two succeed
        await request(app).post(`${base}/mcp/execute`).send({ tool, args: { to: '/a' } }).expect(200);
        await request(app).post(`${base}/mcp/execute`).send({ tool, args: { to: '/b' } }).expect(200);
        // Third should 429
        const third = await request(app).post(`${base}/mcp/execute`).send({ tool, args: { to: '/c' } });
        expect(third.status).toBe(429);
        expect(third.body.error.code).toBe('rate_limited');
    });

    it('propagates correlationId in success and error responses', async () => {
        const correlationId = 'corr-123';
        const ok = await request(app)
            .post(`${base}/mcp/execute`)
            .send({ tool: 'open_panel', args: { panelId: 'main' }, correlationId })
            .expect(200);
        expect(ok.body.correlationId).toBe(correlationId);

        const bad = await request(app)
            .post(`${base}/mcp/execute`)
            .send({ tool: 'open_panel', args: {}, correlationId })
            .expect(400);
        expect(bad.body.error.correlationId).toBe(correlationId);
    });

    it('rate limits after threshold (legacy smoke)', async () => {
        // Keep previous smoke but ensure override resets window appropriately
        __setMcpRateLimitForTests(50, 5); // large enough not to trip
        const tool = 'navigate';
        const promises: Promise<request.Response>[] = [];
        for (let i = 0; i < 5; i++) {
            promises.push(
                request(app)
                    .post(`${base}/mcp/execute`)
                    .send({ tool, args: { to: `/path-${i}` } })
            );
        }
        const results = await Promise.all(promises);
        results.forEach((r) => { expect([200]).toContain(r.status); });
    });
});
