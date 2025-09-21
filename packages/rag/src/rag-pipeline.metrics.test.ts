import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chunk, Embedder, Store } from './lib/index.js';
import { RAGPipeline } from './rag-pipeline.js';

// Mock observability to capture metrics
const obs = vi.hoisted(() => {
  return {
    generateRunId: vi.fn(() => 'RUN'),
    recordLatency: vi.fn(),
    recordOperation: vi.fn(),
  };
});

vi.mock('@cortex-os/observability', () => ({
  generateRunId: obs.generateRunId,
  recordLatency: obs.recordLatency,
  recordOperation: obs.recordOperation,
}));

class MockEmbedder implements Embedder {
  async embed(queries: string[]): Promise<number[][]> {
    return queries.map(() => [0.1, 0.2, 0.3]);
  }
}

class MockStore implements Store {
  async upsert(_chunks: Chunk[]): Promise<void> {
    const __ = _chunks; // eslint-disable-line @typescript-eslint/no-unused-vars
  }
  async query(_embedding: number[], k = 5): Promise<Array<Chunk & { score?: number }>> {
    const __ = _embedding; // eslint-disable-line @typescript-eslint/no-unused-vars
    return Array.from({ length: k }).map((_, i) => ({
      id: `id-${i + 1}`,
      text: `text-${i + 1}`,
      source: 'src',
      score: 1 - i * 0.1,
    }));
  }
}

describe('RAGPipeline ingest metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits ingest latency metrics and size counters', async () => {
    const pipeline = new RAGPipeline({
      embedder: new MockEmbedder(),
      store: new MockStore(),
      security: { allowedEmbeddingDims: [3] },
    });
    const chunks: Chunk[] = [
      { id: 'a', text: 'hello', source: 's1' },
      { id: 'b', text: 'world', source: 's2' },
    ];
    await pipeline.ingest(chunks);

    // Existing size metrics
    expect(obs.recordLatency).toHaveBeenCalledWith(
      'rag.embed.batch_size',
      2,
      expect.objectContaining({ component: 'rag' }),
    );
    expect(obs.recordLatency).toHaveBeenCalledWith(
      'rag.chunk.total_chars',
      expect.any(Number),
      expect.objectContaining({ component: 'rag' }),
    );

    // New latency metrics for ingest path
    expect(obs.recordLatency).toHaveBeenCalledWith(
      'rag.ingest.embed_ms',
      expect.any(Number),
      expect.objectContaining({ component: 'rag' }),
    );
    expect(obs.recordLatency).toHaveBeenCalledWith(
      'rag.ingest.upsert_ms',
      expect.any(Number),
      expect.objectContaining({ component: 'rag' }),
    );
    expect(obs.recordLatency).toHaveBeenCalledWith(
      'rag.ingest.total_ms',
      expect.any(Number),
      expect.objectContaining({ component: 'rag' }),
    );

    // Top-level ingest operation recorded
    expect(obs.recordOperation).toHaveBeenCalledWith(
      'rag.ingest',
      true,
      'RUN',
      expect.objectContaining({ component: 'rag' }),
    );

    // Correlated component operations should use same run id
    expect(obs.recordOperation).toHaveBeenCalledWith(
      'rag.embedder',
      true,
      'RUN',
      expect.objectContaining({ component: 'rag' }),
    );
    expect(obs.recordOperation).toHaveBeenCalledWith(
      'rag.store',
      true,
      'RUN',
      expect.objectContaining({ component: 'rag' }),
    );
  });

  it('emits ingest operation metric on error with correlation', async () => {
    class FailingEmbedder implements Embedder {
      async embed(): Promise<number[][]> {
        throw new Error('embed failed');
      }
    }
    const pipeline = new RAGPipeline({
      embedder: new FailingEmbedder(),
      store: new MockStore(),
      security: { allowedEmbeddingDims: [3] },
    });
    const chunks: Chunk[] = [{ id: 'a', text: 'hello', source: 's1' }];

    await expect(pipeline.ingest(chunks)).rejects.toThrow('embed failed');

    // Should still record ingest total latency
    expect(obs.recordLatency).toHaveBeenCalledWith(
      'rag.ingest.total_ms',
      expect.any(Number),
      expect.objectContaining({ component: 'rag' }),
    );
    // And an operation with success=false; a run id is generated; correlation info present
    expect(obs.recordOperation).toHaveBeenCalledWith(
      'rag.ingest',
      false,
      expect.any(String),
      expect.objectContaining({ component: 'rag' }),
    );

    // Embedder should also record failed operation with same run id 'RUN'
    expect(obs.recordOperation).toHaveBeenCalledWith(
      'rag.embedder',
      false,
      'RUN',
      expect.objectContaining({ component: 'rag' }),
    );
  });
});
