import { describe, it, expect } from 'vitest';
import { createServer } from '../src/server';

describe('request validation', () => {
  let app: ReturnType<typeof createServer>;

  beforeAll(() => {
    app = createServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects invalid embeddings payload', async () => {
    const res = await app.inject({ method: 'POST', url: '/embeddings', payload: { texts: [] } });
    expect(res.statusCode).toBe(400);
  });

  it('rejects invalid rerank payload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/rerank',
      payload: { query: 'q', docs: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects invalid chat payload', async () => {
    const res = await app.inject({ method: 'POST', url: '/chat', payload: { msgs: [] } });
    expect(res.statusCode).toBe(400);
  });
});
