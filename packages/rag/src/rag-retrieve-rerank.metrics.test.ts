import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chunk, Embedder } from './lib/index.js';
import type { Qwen3Reranker } from './pipeline/qwen3-reranker.js';
import { RAGPipeline } from './rag-pipeline.js';

// Mock observability
const obs = vi.hoisted(() => ({
    generateRunId: vi.fn(() => 'RUN'),
    recordLatency: vi.fn(),
    recordOperation: vi.fn(),
}));

vi.mock('@cortex-os/observability', () => ({
    generateRunId: obs.generateRunId,
    recordLatency: obs.recordLatency,
    recordOperation: obs.recordOperation,
}));

class StubEmbedder {
    async embed(queries: string[]): Promise<number[][]> {
        return queries.map((_q, i) => [i % 3, (i + 1) % 3, 1]);
    }
}

const stubReranker: Pick<Qwen3Reranker, 'rerank'> = {
    async rerank(_q: string, arr: Array<{ id: string; text: string }>, topK: number) {
        return arr.slice(0, topK).map((d, i) => ({ id: d.id, text: d.text, score: 1 - i * 0.1 }));
    },
};

describe('RAGPipeline retrieveAndRerank metrics', () => {
    beforeEach(() => vi.clearAllMocks());

    it('correlates retrieve and reranker via shared run id and emits retrieve metrics', async () => {
        const pipeline = new RAGPipeline({
            embedder: new StubEmbedder() as unknown as Embedder,
            store: {
                async upsert(chunks: Chunk[]) {
                    const _ = chunks; // eslint-disable-line @typescript-eslint/no-unused-vars
                },
                async query(embedding: number[], k = 5) {
                    const __ = embedding; // eslint-disable-line @typescript-eslint/no-unused-vars
                    return Array.from({ length: k }).map((_, i) => ({
                        id: `id-${i + 1}`,
                        text: `text-${i + 1}`,
                        source: 'src',
                        score: 1 - i * 0.1,
                    }));
                },
            },
            security: { allowedEmbeddingDims: [3] },
        });

        // Seed with ingest
        await pipeline.ingest([{ id: 'seed', text: 'alpha beta', source: 's' }]);

        const out = await pipeline.retrieveAndRerank(
            'query',
            3,
            stubReranker as unknown as Qwen3Reranker,
        );
        expect(out.length).toBe(3);

        // Retrieve metrics
        expect(obs.recordLatency).toHaveBeenCalledWith(
            'rag.retrieve.embed_ms',
            expect.any(Number),
            expect.objectContaining({ component: 'rag' }),
        );
        expect(obs.recordLatency).toHaveBeenCalledWith(
            'rag.retrieve.query_ms',
            expect.any(Number),
            expect.objectContaining({ component: 'rag' }),
        );
        expect(obs.recordLatency).toHaveBeenCalledWith(
            'rag.retrieve.total_ms',
            expect.any(Number),
            expect.objectContaining({ component: 'rag' }),
        );
        expect(obs.recordOperation).toHaveBeenCalledWith(
            'rag.retrieve',
            true,
            'RUN',
            expect.any(Object),
        );

        // Reranker correlated
        expect(obs.recordOperation).toHaveBeenCalledWith(
            'rag.reranker',
            true,
            'RUN',
            expect.any(Object),
        );
    });

    it('records failure with correlation when retrieve embedder fails (degraded mode)', async () => {
        class FailingEmbedder {
            async embed() {
                throw new Error('embed failed');
            }
        }
        const pipeline = new RAGPipeline({
            embedder: new FailingEmbedder() as unknown as Embedder,
            store: {
                async upsert() { },
                async query() {
                    return [] as Array<Chunk & { score?: number }>;
                },
            },
            security: { allowedEmbeddingDims: [3] },
        });

        const out = await pipeline.retrieveAndRerank(
            'q',
            2,
            stubReranker as unknown as Qwen3Reranker,
        );
        expect(out).toEqual([]);

        // Embedder failed, ensure failure is recorded on embedder and correlation id is threaded
        expect(obs.recordOperation).toHaveBeenCalledWith(
            'rag.embedder',
            false,
            'RUN',
            expect.any(Object),
        );
        // Retrieve may still be marked success in degraded mode
        expect(obs.recordOperation).toHaveBeenCalledWith(
            'rag.retrieve',
            true,
            'RUN',
            expect.any(Object),
        );
        // Top-level remains success due to degraded mode returning safe result
        expect(obs.recordOperation).toHaveBeenCalledWith(
            'rag.retrieve_and_rerank',
            true,
            'RUN',
            expect.any(Object),
        );
    });

    it('records failure with correlation when reranker fails (degraded mode)', async () => {
        const pipeline = new RAGPipeline({
            embedder: new StubEmbedder() as unknown as Embedder,
            store: {
                async upsert() { },
                async query(_: number[], k = 5) {
                    return Array.from({ length: k }).map((__, i) => ({
                        id: `id-${i + 1}`,
                        text: `text-${i + 1}`,
                        source: 'src',
                        score: 1 - i * 0.1,
                    }));
                },
            },
            security: { allowedEmbeddingDims: [3] },
        });
        const failingReranker: Pick<Qwen3Reranker, 'rerank'> = {
            async rerank() {
                throw new Error('rerank failed');
            },
        };

        const out = await pipeline.retrieveAndRerank(
            'q',
            2,
            failingReranker as unknown as Qwen3Reranker,
        );
        // In degraded mode, pass through retrieval results (topK)
        expect(out).toEqual([
            { id: 'id-1', content: 'text-1' },
            { id: 'id-2', content: 'text-2' },
        ]);
        // retrieve succeeded, rerank failed; top-level remains success due to degraded mode
        expect(obs.recordOperation).toHaveBeenCalledWith(
            'rag.retrieve',
            true,
            'RUN',
            expect.any(Object),
        );
        expect(obs.recordOperation).toHaveBeenCalledWith(
            'rag.retrieve_and_rerank',
            true,
            'RUN',
            expect.any(Object),
        );
        // reranker failure correlated
        expect(obs.recordOperation).toHaveBeenCalledWith(
            'rag.reranker',
            false,
            'RUN',
            expect.any(Object),
        );
    });
});
