import { describe, expect, it } from 'vitest';
import { FlatIndex } from './flat-index.js';

describe('FlatIndex (baseline)', () => {
    it('adds vectors and queries nearest by cosine distance', async () => {
        const idx = new FlatIndex();
        await idx.init(3);
        await idx.add('a', [1, 0, 0]);
        await idx.add('b', [0, 1, 0]);
        await idx.add('c', [0.9, 0.1, 0]);

        const res = await idx.query([1, 0, 0], 2);
        expect(res.map((r) => r.id)).toEqual(['a', 'c']);
        expect(res[0].distance).toBeCloseTo(0, 6);
    });

    it.skip('performs within baseline for 10k vectors (placeholder)', async () => {
        // Placeholder for Priority 2 benchmarks (>10x vs linear scan once HNSW lands)
        // Will be implemented with an HNSW index and compared here.
    });
});
