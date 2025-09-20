import { describe, expect, it } from 'vitest';
import { TokenBucket } from '../src/lib/rate-limiter.js';
import { rerankDocs } from '../src/lib/rerank-docs.js';
import type { Qwen3Reranker } from '../src/pipeline/qwen3-reranker.js';

class FakeReranker {
    private count = 0;
    constructor(private failUntil: number) { }
    async rerank(_q: string, docs: { id: string; text: string }[], topK?: number) {
        this.count++;
        if (this.count <= this.failUntil) throw new Error('flaky');
        return docs.slice(0, topK ?? docs.length).map((d, i) => ({ ...d, score: 1 - i * 0.01 }));
    }
}

describe('rerankDocs reliability', () => {
    it('retries then succeeds', async () => {
        const rr = new FakeReranker(2);
        const asReranker = rr as unknown as Pick<Qwen3Reranker, 'rerank'>;
        const docs = Array.from({ length: 5 }, (_, i) => ({ id: `d${i}`, content: `t${i}` }));
        const out = await rerankDocs(asReranker as Qwen3Reranker, 'q', docs, 3, {
            reliability: { retry: { maxAttempts: 3, baseDelayMs: 1 } },
            fallback: 'none',
        });
        expect(out.length).toBe(3);
    });

    it('falls back to original topK when breaker/retry exhausted', async () => {
        const rr = new FakeReranker(10);
        const asReranker = rr as unknown as Pick<Qwen3Reranker, 'rerank'>;
        const docs = Array.from({ length: 4 }, (_, i) => ({ id: `d${i}`, content: `t${i}` }));
        const out = await rerankDocs(asReranker as Qwen3Reranker, 'q', docs, 2, {
            reliability: {
                retry: { maxAttempts: 2, baseDelayMs: 1 },
                breaker: { failureThreshold: 1, resetTimeoutMs: 10 },
            },
            fallback: 'original-topK',
        });
        expect(out.map((d) => d.id)).toEqual(['d0', 'd1']);
    });

    it('rate limits and returns fallback without invoking reranker', async () => {
        class CountingReranker {
            calls = 0;
            async rerank(_q: string, docs: { id: string; text: string }[], topK?: number) {
                this.calls++;
                return docs.slice(0, topK ?? docs.length).map((d, i) => ({ ...d, score: 1 - i * 0.01 }));
            }
        }
        const bucket = new TokenBucket({ capacity: 1, refillPerSecond: 0, now: () => 0 });
        // consume the single token
        expect(bucket.tryRemove()).toBe(true);
        const rr = new CountingReranker();
        const asReranker = rr as unknown as Pick<Qwen3Reranker, 'rerank'>;
        const docs = Array.from({ length: 3 }, (_, i) => ({ id: `d${i}`, content: `t${i}` }));
        const out = await rerankDocs(asReranker as Qwen3Reranker, 'q', docs, 2, {
            fallback: 'original-topK',
            rateLimiter: bucket,
        });
        // should not call reranker because limited
        expect(rr.calls).toBe(0);
        expect(out.map((d) => d.id)).toEqual(['d0', 'd1']);
    });
});
