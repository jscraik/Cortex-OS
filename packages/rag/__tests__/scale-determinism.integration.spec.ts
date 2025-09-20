import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/store/memory.js';

const ENABLED = process.env.RAG_SCALE_TESTS === '1';

// Guarded larger-scale determinism/perf sanity; skipped by default
(ENABLED ? describe : describe.skip)('scale determinism', () => {
    it('returns deterministic topK for repeated queries on larger set', async () => {
        const store = memoryStore();
        const dim = 128;
        const n = 2000;
        function vec(seed: number): number[] {
            const out = new Array(dim);
            for (let i = 0; i < dim; i++) out[i] = Math.sin(seed * 0.13 + i * 0.07);
            return out;
        }
        const chunks = Array.from({ length: n }, (_, i) => ({ id: `id-${i}`, text: `t${i}`, embedding: vec(i) }));
        await store.upsert(chunks);
        const q = vec(42);
        const a = await store.query(q, 10);
        const b = await store.query(q, 10);
        expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id));
    }, 15_000);
});
