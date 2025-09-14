import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createASBRServer } from '../../src/api/server.js';

// NOTE: We construct server with rateLimit.enabled=true and temporarily monkey patch isTestEnv by
// setting NODE_ENV to production for the duration of the test to ensure limiter applies.

const originalNodeEnv = process.env.NODE_ENV;

describe('integration: rate limiting', () => {
  let server: ReturnType<typeof createASBRServer>;
  let base: any; // supertest instance (loose typing to avoid module resolution type mismatch)

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    server = createASBRServer({ port: 0, rateLimit: { enabled: true, capacity: 3, refillRatePerSec: 0 } });
    await server.start();
    const address = (server.server as any).address();
    const url = `http://127.0.0.1:${address.port}`;
    base = request(url);
  });

  afterAll(async () => {
    process.env.NODE_ENV = originalNodeEnv;
    await server.stop();
  });

  it('returns 429 after capacity exhausted', async () => {
    // First 3 should pass authentication fails (401) because we aren't setting auth header; limiter still consumes tokens.
    for (let i = 0; i < 3; i++) {
      await base.post('/v1/tasks').send({ input: { title: 't', brief: 'b', inputs: [], scopes: [], schema: 'cortex.task.input@1' } }).set('Authorization', 'Bearer test').expect((res) => {
        // Either 200 (if bypass) or 400/401/403 depending on auth; token consumed regardless.
        expect(res.status).toBeLessThan(500);
      });
    }
    const fourth = await base.post('/v1/tasks').send({ input: { title: 't', brief: 'b', inputs: [], scopes: [], schema: 'cortex.task.input@1' } }).set('Authorization', 'Bearer test');
    expect(fourth.status).toBe(429);
    expect(fourth.body).toMatchObject({ code: 'RATE_LIMITED' });
    expect(fourth.headers['retry-after']).toBeDefined();
  });
});
