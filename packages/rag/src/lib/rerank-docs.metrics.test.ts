import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Qwen3Reranker } from '../pipeline/qwen3-reranker.js';
import { rerankDocs } from './rerank-docs.js';
import type { Document, ReliabilityPolicy } from './types.js';

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

// Minimal reranker stub
class MockReranker {
    async rerank(_q: string, docs: Array<{ id: string; text: string }>, topK: number) {
        return docs.slice(0, topK).map((d, i) => ({ id: d.id, text: d.text, score: 1 - i * 0.1 }));
    }
}

describe('rerankDocs metrics', () => {
    beforeEach(() => vi.clearAllMocks());

    it('emits latency and score distribution metrics', async () => {
        const docs: Document[] = [
            { id: 'd1', content: 'a' },
            { id: 'd2', content: 'b' },
            { id: 'd3', content: 'c' },
        ];
        const rel: ReliabilityPolicy = {};
        const reranker = new MockReranker() as unknown as Qwen3Reranker;

        const out = await rerankDocs(reranker, 'q', docs, 3, { reliability: rel });
        expect(out).toHaveLength(3);

        // Existing latency/operation
        expect(obs.recordLatency).toHaveBeenCalledWith(
            'rag.reranker',
            expect.any(Number),
            expect.objectContaining({ component: 'rag' }),
        );
        expect(obs.recordOperation).toHaveBeenCalledWith('rag.reranker', true, 'RUN', {
            component: 'rag',
        });

        // New score distribution buckets
        expect(obs.recordLatency).toHaveBeenCalledWith(
            'rag.reranker.score_p50',
            expect.any(Number),
            expect.any(Object),
        );
        expect(obs.recordLatency).toHaveBeenCalledWith(
            'rag.reranker.score_p95',
            expect.any(Number),
            expect.any(Object),
        );
        expect(obs.recordLatency).toHaveBeenCalledWith(
            'rag.reranker.score_mean',
            expect.any(Number),
            expect.any(Object),
        );
    });
});
