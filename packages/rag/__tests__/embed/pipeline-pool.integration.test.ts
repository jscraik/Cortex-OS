import { describe, expect, it, vi } from 'vitest';
import { RAGPipeline } from '../../src/rag-pipeline.js';
import { memoryStore } from '../../src/store/memory.js';
import type { Embedder } from '../../src/lib/types.js';
import { PooledEmbedder } from '../../src/embed/embedding-pool.js';

function fakeEmbedder(delayMs = 0): Embedder {
  const embed = vi.fn(async (texts: string[]) => {
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    return texts.map((t) => Array.from({ length: 4 }, (_, i) => (t.length + i) % 7));
  });
  return { embed };
}

describe('RAGPipeline + PooledEmbedder integration', () => {
  it('improves ingest throughput with pooling', async () => {
    const docs = Array.from({ length: 24 }, (_, i) => ({ id: `d${i}`, text: 'x'.repeat(50) }));
    const chunks = docs.map((d) => ({ id: d.id, text: d.text }));

    // Baseline: single worker embedder
    const base = new RAGPipeline({
      embedder: fakeEmbedder(10),
      store: memoryStore(),
      security: { allowedEmbeddingDims: [4] },
    });
    const t1 = Date.now();
    await base.ingest(chunks);
    const d1 = Date.now() - t1;

    // Pooled: 4 workers
    const pooled = new RAGPipeline({
      embedder: new PooledEmbedder(fakeEmbedder(10), { minWorkers: 4, maxWorkers: 4, batchSize: 1 }),
      store: memoryStore(),
      security: { allowedEmbeddingDims: [4] },
    });
    const t2 = Date.now();
    await pooled.ingest(chunks);
    const d2 = Date.now() - t2;

    expect(d1 / Math.max(1, d2)).toBeGreaterThan(2);
  });
});
