import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// Mock A2A to avoid transitive imports that require @cortex-os/contracts resolution in Vitest
vi.mock('@cortex-os/a2a', () => ({
    handleA2A: async () => 'OK',
}));
vi.mock('../../../libs/typescript/contracts/dist/src/index.js', async () => {
    const { z } = await import('zod');
    const AgentConfigSchema = z.object({
        seed: z.number(),
        maxTokens: z.number(),
        timeoutMs: z.number(),
        memory: z.object({ maxItems: z.number(), maxBytes: z.number() }),
    });
    const MCPRequestSchema = z.object({ tool: z.string(), args: z.any().optional() });
    const A2AMessageSchema = z.object({
        from: z.string(),
        to: z.string(),
        action: z.string(),
        data: z.any().optional(),
    });
    const RAGQuerySchema = z.object({ query: z.string().min(1), topK: z.number().optional() });
    const SimlabCommandSchema = z.object({ scenario: z.string(), step: z.string(), params: z.any().optional() });
    return { AgentConfigSchema, MCPRequestSchema, A2AMessageSchema, RAGQuerySchema, SimlabCommandSchema };
});

describe('gateway server routes', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        const { start } = await import('../src/server');
        app = await start(0); // bind to random port; we will use injection
    });

    afterAll(async () => {
        if (app) await app.close();
    });

    it('serves openapi.json', async () => {
        const res = await app.inject({ method: 'GET', url: '/openapi.json' });
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('application/json');
        // Ensure body looks like an OpenAPI document without relying on JSON module typing
        expect(String(res.body)).toContain('"openapi"');
    });

    it('serves /metrics as text', async () => {
        const res = await app.inject({ method: 'GET', url: '/metrics' });
        expect(res.statusCode).toBe(200);
        expect(String(res.headers['content-type']).toLowerCase()).toContain('text/plain');
        expect(String(res.body)).toContain('http_request_duration_ms');
    });

    it('returns INVALID_INPUT on bad /rag body', async () => {
        const res = await app.inject({ method: 'POST', url: '/rag', payload: { not: 'expected' } });
        // Body fails schema validation in createAgentRoute
        expect(res.statusCode).toBe(400);
        expect(res.headers['content-type']).toContain('application/json');
        expect(String(res.body)).toContain('INVALID_BODY');
    });

    it('returns INVALID_BODY on bad /a2a body', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/a2a?json=true',
            payload: { bogus: true },
        });
        // Body invalid -> 400 via createAgentRoute
        expect(res.statusCode).toBe(400);
        expect(res.headers['content-type']).toContain('application/json');
        expect(String(res.body)).toContain('INVALID_BODY');
    });

    it('returns INVALID_BODY on bad /simlab body', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/simlab?json=true',
            payload: { bogus: true },
        });
        expect(res.statusCode).toBe(400);
        expect(res.headers['content-type']).toContain('application/json');
        expect(String(res.body)).toContain('INVALID_BODY');
    });
});
