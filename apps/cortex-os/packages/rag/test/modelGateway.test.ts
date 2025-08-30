import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelGatewayClient, createModelGatewayClient } from '../src/modelGateway';

// Minimal embedding-like object
const makeEmbedding = (i: number) => ({
  embedding: [i, i + 0.1],
  model: 'test',
  usage: { tokens: 1 },
});

describe('ModelGatewayClient embeddings compatibility', () => {
  let client: ModelGatewayClient;

  beforeEach(() => {
    client = createModelGatewayClient({ baseUrl: 'http://example' });
    // @ts-ignore global fetch in test env
    globalThis.fetch = vi.fn();
  });

  it('handles new /embeddings returning { embeddings: [...] }', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ embeddings: [makeEmbedding(1), makeEmbedding(2)] }),
    });

    const res = await client.generateEmbeddings(['a', 'b']);
    expect(res).toHaveLength(2);
    expect(res[0].embedding[0]).toBe(1);
  });

  it('falls back to /embeddings/batch when /embeddings not found', async () => {
    // first call - new endpoint returns 404
    (globalThis.fetch as any)
      .mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'not found' })
      // second call - legacy batch returns array
      .mockResolvedValueOnce({ ok: true, json: async () => [makeEmbedding(3), makeEmbedding(4)] });

    const res = await client.generateEmbeddings(['x', 'y']);
    expect(res).toHaveLength(2);
    expect(res[0].embedding[0]).toBe(3);
  });
});
