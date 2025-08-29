import { describe, it, expect } from 'vitest';
import { createServer } from '../src/server';

describe('request validation', () => {
  it('rejects invalid embeddings payload', async () => {
    const app = createServer();
    const res = await app.inject({ method: 'POST', url: '/embeddings', payload: { texts: [] } });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('rejects invalid rerank payload', async () => {
    const app = createServer();
    const res = await app.inject({
      method: 'POST',
      url: '/rerank',
      payload: { query: 'q', docs: [] },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('rejects invalid chat payload', async () => {
    const app = createServer();
    const res = await app.inject({ method: 'POST', url: '/chat', payload: { msgs: [] } });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
