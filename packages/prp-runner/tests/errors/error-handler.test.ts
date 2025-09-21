import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../../src/errors';
import { errorHandler } from '../../src/lib/server/error-handler';
import { applyServerHardening } from '../../src/lib/server/hardening';

let originalNodeEnv: string | undefined;

beforeAll(() => {
    originalNodeEnv = process.env.NODE_ENV;
});

afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
});

describe('Error Handler', () => {
    let app: express.Express;

    beforeEach(() => {
        app = express();
        applyServerHardening(app);
        app.get('/boom', () => {
            throw new AppError('Kaboom', 'INTERNAL_ERROR', 500);
        });
        app.get('/kaboom', () => {
            throw new Error('Bad');
        });
        app.use(errorHandler);
    });

    it('returns structured JSON with requestId and hides stack in production', async () => {
        process.env.NODE_ENV = 'production';
        const res = await request(app).get('/boom').set('x-request-id', 'req-1');
        expect(res.status).toBe(500);
        expect(res.body.requestId).toBe('req-1');
        expect(res.body.error).toBe('Kaboom');
        expect(res.body.code).toBe('INTERNAL_ERROR');
        expect(res.body.stack).toBeUndefined();
    });

    it('includes stack when not in production', async () => {
        delete process.env.NODE_ENV;
        const res = await request(app).get('/kaboom').set('x-request-id', 'req-2');
        expect(res.status).toBe(500);
        expect(res.body.requestId).toBe('req-2');
        expect(res.body.error).toBe('Bad');
        expect(res.body.stack).toBeDefined();
    });
});
