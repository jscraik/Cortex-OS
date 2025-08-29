import { describe, it, expect, vi } from 'vitest';
import { createServer } from './server.js';
import type { ModelRouter } from './model-router.js';

vi.mock('./audit', () => ({
  auditEvent: vi.fn(() => ({})),
  record: vi.fn(async () => {}),
}));

vi.mock('./policy', () => ({
  loadGrant: vi.fn(async () => ({})),
  enforce: vi.fn(),
}));

class MockModelRouter {
  async generateEmbeddings({ texts, model }: { texts: string[]; model?: string }) {
    return {
      embeddings: texts.map(() => [0.1, 0.2]),
      model: model || 'mock-model',
    };
  }
}

describe('embeddings endpoint', () => {
  it('returns embeddings array', async () => {
    const server = createServer(new MockModelRouter() as unknown as ModelRouter);
    const res = await server.inject({
      method: 'POST',
      url: '/embeddings',
      payload: { texts: ['hello'] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.embeddings).toHaveLength(1);
    expect(body.modelUsed).toBe('mock-model');
    await server.close();
  });
});
