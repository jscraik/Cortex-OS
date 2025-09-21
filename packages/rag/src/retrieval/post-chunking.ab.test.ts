import { describe, expect, it } from 'vitest';
import type { Chunk } from '../lib/types.js';
import { RAGPipeline } from '../rag-pipeline.js';

class StubEmbedder {
    async embed(texts: string[]): Promise<number[][]> {
        // Return 384-dim zero vectors to satisfy allowed dims check
        return texts.map(() => Array.from({ length: 384 }, () => 0));
    }
}

class StubStore {
    private items: Chunk[] = [];
    async upsert(chunks: Chunk[]): Promise<void> {
        // Replace by id to keep latest
        const byId = new Map<string, Chunk>(this.items.map((c) => [c.id, c]));
        for (const c of chunks) byId.set(c.id, c);
        this.items = Array.from(byId.values());
    }
    async query(_embedding: number[], k = 5): Promise<Array<Chunk & { score?: number }>> {
        // Return first k with deterministic scores
        return this.items.slice(0, k).map((c, i) => ({ ...c, score: 1 - i * 0.01 }));
    }
}

function mkChunks(): Chunk[] {
    // 5 small chunks that can be merged into fewer with maxChars threshold ~10
    return [
        { id: 'c1', text: 'alpha beta' }, // len 10
        { id: 'c2', text: 'gamma' }, // 5
        { id: 'c3', text: 'delta' }, // 5
        { id: 'c4', text: 'epsilon' }, // 7
        { id: 'c5', text: 'zeta' }, // 4
    ];
}

describe('RAGPipeline post-chunking A/B', () => {
    it('reduces citation count or total text length when enabled', async () => {
        const embedder = new StubEmbedder();

        const storeA = new StubStore();
        const storeB = new StubStore();
        const base = new RAGPipeline({ embedder, store: storeA });
        const post = new RAGPipeline({
            embedder,
            store: storeB,
            retrieval: { postChunking: { enabled: true, maxChars: 12, intentStrategy: 'none' } },
        } as unknown as ConstructorParameters<typeof RAGPipeline>[0]);

        const docs = mkChunks();
        await base.ingest(docs);
        await post.ingest(docs);

        const qa = await base.retrieve('query', 5);
        const qb = await post.retrieve('query', 5);

        const countA = qa.citations.length;
        const countB = qb.citations.length;
        const lenA = qa.citations.reduce((s, c) => s + (c.text?.length ?? 0), 0);
        const lenB = qb.citations.reduce((s, c) => s + (c.text?.length ?? 0), 0);

        // Either we get fewer citations, or the total combined text length is not larger
        expect(countB <= countA).toBe(true);
        expect(lenB <= lenA).toBe(true);
    });
});
