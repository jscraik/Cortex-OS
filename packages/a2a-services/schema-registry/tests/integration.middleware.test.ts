import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createService } from '../src/service';

describe('Schema Registry Middleware Integration', () => {
  const aclConfig = {
    rules: [
      { topic: 'registry.schemas', publish: true, subscribe: true, roles: ['admin', 'reader'] }
    ],
    defaultPublish: false,
    defaultSubscribe: false
  };

  it('denies publish when role not allowed (403)', async () => {
    const app = createService({ aclConfig });
    await request(app)
      .post('/schemas')
      .set('x-role', 'guest')
      .send({ id: '1', name: 'Foo', version: '1.0.0', schema: { field: 'value' } })
      .expect(403);
  });

  it('redacts sensitive fields in responses', async () => {
    const app = createService({ aclConfig, redactionPaths: ['schema.secret'] });
    // Allowed publish
    await request(app)
      .post('/schemas')
      .set('x-role', 'admin')
      .send({ id: '1', name: 'Foo', version: '1.0.0', schema: { secret: 'top', visible: 'keep' } })
      .expect(201);
    const res = await request(app)
      .get('/schemas/Foo/latest')
      .set('x-role', 'reader')
      .expect(200);
    expect(res.body.schema.secret).toBe('***');
    expect(res.body.schema.visible).toBe('keep');
  });

  it('applies burst smoothing before quotas (exhaust burst then quota still counts)', async () => {
    const app = createService({
      aclConfig,
      redactionPaths: [],
      enableSmoothing: true,
      enableQuota: true,
      enablePerAgentQuota: true,
    });

    // Simulate rapid requests to hit burst smoother rejection but not yet global quota limit.
    const attempt = async () => request(app)
      .get('/schemas')
      .set('x-role', 'reader')
      .expect((r: request.Response) => {
        if (![200, 403, 429].includes(r.status)) throw new Error(`Unexpected status ${r.status}`);
      });

    const results: number[] = [];
    for (let i = 0; i < 30; i++) {
      const res = await attempt();
      results.push(res.status);
    }
    // Expect at least one 429 due to smoothing but still many 200s (quota not yet exhausted at 30 < 500)
    expect(results.filter(s => s === 429).length).toBeGreaterThan(0);
    expect(results.filter(s => s === 200).length).toBeGreaterThan(0);
  });
});
