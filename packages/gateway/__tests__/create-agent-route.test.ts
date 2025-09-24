import Fastify from 'fastify';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createAgentRoute } from '../src/lib/create-agent-route.js';

// Minimal shim for createJsonOutput contract by asserting content-type and payload shape
function parseBody<T = unknown>(body: unknown): T {
    try {
        if (typeof body === 'string') return JSON.parse(body) as T;
        return body as T;
    } catch {
        return body as T;
    }
}

describe('createAgentRoute', () => {
    let app: ReturnType<typeof Fastify>;

    beforeEach(async () => {
        app = Fastify();
    });

    it('coerces json query to boolean and responds with JSON when set', async () => {
        const schema = z.object({ foo: z.string(), json: z.boolean().optional() });
        createAgentRoute(app, '/test', schema, async (input) => ({ ok: true, foo: input.foo }));
        const res = await app.inject({
            method: 'POST',
            url: '/test?json=not-a-bool',
            payload: { foo: 'bar' },
        });
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('application/json');
        const body = parseBody(res.body);
        expect(body).toEqual({ ok: true, foo: 'bar' });
    });

    it('validates body and returns 400 on invalid body', async () => {
        createAgentRoute(app, '/test', z.object({ foo: z.string() }), async () => ({}));
        const res = await app.inject({ method: 'POST', url: '/test?json=true', payload: { foo: 1 } });
        expect(res.statusCode).toBe(400);
        expect(res.headers['content-type']).toContain('application/json');
        expect(String(res.body)).toContain('INVALID_BODY');
    });

    it('calls handler with parsed input and respects json content-type', async () => {
        const schema = z.object({ foo: z.string(), json: z.boolean().optional() });
        createAgentRoute(app, '/ok', schema, async (input) => ({ ok: true, foo: input.foo }));

        const res = await app.inject({ method: 'POST', url: '/ok?json=true', payload: { foo: 'bar' } });
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('application/json');
        const body = parseBody(res.body);
        expect(body).toEqual({ ok: true, foo: 'bar' });
    });

    it('returns text/plain when json=false (empty value coerces to false)', async () => {
        const schema = z.object({ foo: z.string(), json: z.boolean().optional() });
        createAgentRoute(app, '/ok2', schema, async (input) => `foo=${input.foo}`);

        const res = await app.inject({
            method: 'POST',
            url: '/ok2?json=',
            payload: { foo: 'baz' },
        });
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/plain');
        expect(res.body).toBe('foo=baz');
    });
});
