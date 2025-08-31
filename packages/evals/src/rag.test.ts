import { describe, it, expect, vi } from 'vitest';

vi.mock('@cortex-os/model-gateway', () => ({ createModelRouter: vi.fn() }));
vi.mock('@cortex-os/rag/eval/harness', () => ({
  prepareStore: vi.fn(),
  runRetrievalEval: vi.fn().mockResolvedValue({
    k: 1,
    ndcg: 1,
    recall: 1,
    precision: 1,
    totalQueries: 1,
  }),
}));
vi.mock('@cortex-os/rag/store/memory', () => ({ memoryStore: vi.fn() }));

import { runRagSuite } from './suites/rag';

const embedder = { embed: async (texts: string[]) => texts.map((t) => [t.length]) };

describe('runRagSuite', () => {
  it('passes when metrics meet thresholds', async () => {
    const res = await runRagSuite('rag', { dataset: {}, k: 1, thresholds: { ndcg: 0, recall: 0, precision: 0 } }, embedder);
    expect(res.pass).toBe(true);
  });

  it('fails when metrics below thresholds', async () => {
    const harness = await import('@cortex-os/rag/eval/harness');
    vi.mocked(harness.runRetrievalEval).mockResolvedValueOnce({
      k: 1,
      ndcg: 0,
      recall: 0,
      precision: 0,
      totalQueries: 1,
    } as any);
    const res = await runRagSuite('rag', { dataset: {}, k: 1, thresholds: { ndcg: 0.5, recall: 0.5, precision: 0.5 } }, embedder);
    expect(res.pass).toBe(false);
  });

  it('defaults to router embedder when none provided', async () => {
    const mgw = await import('@cortex-os/model-gateway');
    vi.mocked(mgw.createModelRouter).mockReturnValue({
      initialize: async () => {},
      generateEmbeddings: async ({ texts }: any) => ({ embeddings: texts.map((t: string) => [t.length]) }),
    } as any);
    const res = await runRagSuite('rag', { dataset: {}, k: 1 });
    expect(mgw.createModelRouter).toHaveBeenCalled();
    expect(res.pass).toBe(true);
  });
});
