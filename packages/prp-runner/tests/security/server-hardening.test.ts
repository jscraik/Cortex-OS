import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ASBRAIMcpServer } from '../../src/asbr-ai-mcp-server';
import { applyServerHardening } from '../../src/lib/server/hardening';
import { createHealthRouter } from '../../src/lib/server/health-router';

// Minimal mock server implementation
const mcpServer = {
    getHealth: async () => ({ status: 'ok' }),
};

let app: express.Express;

beforeAll(() => {
    process.env.ALLOWED_ORIGINS = 'http://example.com';
});

beforeEach(() => {
    app = express();
    applyServerHardening(app, { jsonLimit: '100kb' });
    app.use('/health', createHealthRouter(mcpServer as unknown as ASBRAIMcpServer));
    // Simple echo for payload + sanitization tests
    app.post('/echo', (_req, res) => {
        res.json({ ok: true });
    });
});

describe('Server Hardening', () => {
    it('applies security headers (helmet)', async () => {
        const res = await request(app).get('/health');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['x-dns-prefetch-control']).toBe('off');
        expect(res.headers['x-frame-options']).toBeDefined();
        expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('enforces JSON payload size limit (413)', async () => {
        const big = 'x'.repeat(200 * 1024); // 200kb
        const res = await request(app)
            .post('/echo')
            .set('content-type', 'application/json')
            .send({ big });
        expect([413, 400]).toContain(res.status); // some express versions send 413 or 400
    });

    it('rejects dangerous input keys (sanitization)', async () => {
        const res = await request(app)
            .post('/echo')
            .set('content-type', 'application/json')
            // Send raw JSON to ensure the dangerous key reaches the server
            .send('{"__proto__": { "polluted": "yes" }}');
        expect(res.status).toBe(400);
        expect(String(res.body.error).toLowerCase()).toMatch(/invalid input/);
    });

    it('sets request id on responses and respects incoming header', async () => {
        const withHeader = await request(app).get('/health').set('x-request-id', 'abc-123');
        expect(withHeader.headers['x-request-id']).toBe('abc-123');

        const generated = await request(app).get('/health');
        expect(generated.headers['x-request-id']).toBeDefined();
        expect(generated.headers['x-request-id']).not.toBe('');
    });

    it('applies CORS for allowed origins only', async () => {
        const allowed = await request(app)
            .options('/health')
            .set('Origin', 'http://example.com')
            .set('Access-Control-Request-Method', 'GET');
        expect(allowed.headers['access-control-allow-origin']).toBe('http://example.com');

        const denied = await request(app)
            .options('/health')
            .set('Origin', 'http://evil.test')
            .set('Access-Control-Request-Method', 'GET');
        expect(denied.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('compresses responses when client accepts gzip', async () => {
        const res = await request(app).get('/health').set('accept-encoding', 'gzip');
        expect(res.headers['content-encoding']).toBe('gzip');
    });
});
