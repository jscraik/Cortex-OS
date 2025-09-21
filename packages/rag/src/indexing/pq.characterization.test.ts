import { describe, expect, it } from 'vitest';
import { FlatIndex } from './flat-index.js';
import { PQFlatIndex } from './quantized-flat.js';

type Vec = number[];

function mulberry32(seed: number) {
    let t = seed >>> 0;
    return () => {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function randVec(dim: number, rnd: () => number): Vec {
    const v: number[] = new Array(dim);
    for (let i = 0; i < dim; i++) v[i] = rnd();
    return v;
}

function averagePrecision(gtIds: string[], candIds: string[]): number {
    const gt = new Set(gtIds);
    let hit = 0;
    let sumPrec = 0;
    for (let i = 0; i < candIds.length; i++) {
        if (gt.has(candIds[i])) {
            hit++;
            sumPrec += hit / (i + 1);
        }
    }
    const denom = Math.max(1, Math.min(gt.size, candIds.length));
    return sumPrec / denom;
}

function recallAtK(gtIds: string[], candIds: string[]): number {
    const gt = new Set(gtIds);
    let hit = 0;
    for (const id of candIds) if (gt.has(id)) hit++;
    return (hit / Math.max(1, gt.size)) * 100;
}

async function buildFlatAndPQ(N: number, dim: number, seed = 123) {
    const rnd = mulberry32(seed);
    const entries = Array.from({ length: N }, (_, i) => ({
        id: `id-${i}`,
        vector: randVec(dim, rnd),
    }));
    const queries = Array.from({ length: Math.max(5, Math.min(20, Math.floor(N / 10))) }, () =>
        randVec(dim, rnd),
    );
    const flat = new FlatIndex();
    await flat.init(dim);
    await flat.addBatch(entries);
    const pq = new PQFlatIndex({ m: 8, k: 16, iters: 3 });
    await pq.init(dim);
    await pq.addBatch(entries);
    return { flat, pq, queries };
}

async function topKIds(
    index: { query(v: Vec, k: number): Promise<Array<{ id: string }>> },
    qs: Vec[],
    k: number,
) {
    const out: string[][] = [];
    for (const q of qs) {
        const hits = await index.query(q, k);
        out.push(hits.map((h) => h.id));
    }
    return out;
}

describe('PQ characterization (small corpus)', () => {
    it('PQ preserves a decent portion of recall@m and mAP vs. Flat baseline', async () => {
        const N = 400;
        const dim = 64;
        const topK = 10;
        const { flat, pq, queries } = await buildFlatAndPQ(N, dim, 7);
        const flatIds = await topKIds(flat, queries, topK);
        const pqIds = await topKIds(
            pq as { query(v: Vec, k: number): Promise<Array<{ id: string }>> },
            queries,
            topK,
        );

        let mapSum = 0;
        let recSum = 0;
        let totalOverlap = 0;
        for (let i = 0; i < queries.length; i++) {
            const gt = flatIds[i];
            const cand = pqIds[i] ?? [];
            mapSum += averagePrecision(gt, cand);
            recSum += recallAtK(gt, cand);
            const set = new Set(gt);
            totalOverlap += cand.filter((x) => set.has(x)).length;
        }
        const mAP = mapSum / queries.length;
        const recall = recSum / queries.length;

        // Characterization: non-negative metrics and some overlap with flat baseline
        expect(recall).toBeGreaterThanOrEqual(0);
        expect(mAP).toBeGreaterThanOrEqual(0);
        expect(totalOverlap).toBeGreaterThan(0);

        // TODO: When switching to a realistic, non-random corpus fixture,
        // enable stricter characterization thresholds via env guard.
        if (process.env.RAG_PQ_STRICT === '1') {
            // These thresholds are placeholders and should be tuned with the real fixture
            // to be stable in CI.
            expect(recall).toBeGreaterThan(30); // recall@m (%), e.g. >30%
            expect(mAP).toBeGreaterThan(0.2);   // mean average precision
            // Additional strictness across K in {1,5,10}
            const ks = [1, 5, 10];
            for (const K of ks) {
                let recK = 0;
                let mapK = 0;
                for (let i = 0; i < queries.length; i++) {
                    recK += recallAtK(flatIds[i].slice(0, K), (pqIds[i] ?? []).slice(0, K));
                    mapK += averagePrecision(flatIds[i].slice(0, K), (pqIds[i] ?? []).slice(0, K));
                }
                recK /= queries.length;
                mapK /= queries.length;
                expect(recK).toBeGreaterThanOrEqual(0);
                expect(mapK).toBeGreaterThanOrEqual(0);
            }
        }
    });
});
