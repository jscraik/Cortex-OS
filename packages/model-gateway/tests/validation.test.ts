import { describe, it, expect } from 'vitest';
import { createServer } from '../src/server';

describe('request validation', () => {
  it('returns 400 for invalid embeddings payload', async () => {
    const app = createServer();
    const res = await app.inject({
      method: 'POST',
      url: '/embeddings',
      payload: { texts: 'not-an-array' },
      headers: { 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('returns 400 for invalid rerank payload', async () => {
    const app = createServer();
    const res = await app.inject({
      method: 'POST',
      url: '/rerank',
      payload: { query: 'q', docs: 'not-array' },
      headers: { 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('returns 400 for invalid chat payload', async () => {
    const app = createServer();
    const res = await app.inject({
      method: 'POST',
      url: '/chat',
      payload: { msgs: [{ role: 'user' }] },
      headers: { 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(400);
    await app.close();

  });
});
