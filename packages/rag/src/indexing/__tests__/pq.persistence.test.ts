import { describe, expect, it } from 'vitest';
import { estimateFlatBytes, estimatePQBytes, PQFlatIndex } from '../quantized-flat.js';

function mulberry32(seed: number) {
	let t = seed >>> 0;
	return () => {
		t += 0x6d2b79f5;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

function randVec(dim: number, rnd: () => number) {
	return Array.from({ length: dim }, () => rnd());
}

describe('PQFlatIndex persistence and storage', () => {
	it('saves and loads codebooks and codes', async () => {
		const dim = 32;
		const N = 200;
		const rnd = mulberry32(9);
		const entries = Array.from({ length: N }, (_, i) => ({
			id: `id-${i}`,
			vector: randVec(dim, rnd),
		}));

		const pq = new PQFlatIndex({ m: 8, k: 16, iters: 2 });
		await pq.init(dim);
		await pq.addBatch(entries);

		const base = `${process.cwd()}/reports/test-out/pq/persist`;
		await pq.save(base);

		const pq2 = new PQFlatIndex();
		await pq2.load(base);

		// Query a couple of vectors and ensure results are stable types / ids exist
		const q = entries[0].vector;
		const res = await pq2.query(q, 5);
		expect(Array.isArray(res)).toBe(true);
		expect(res.length).toBeGreaterThan(0);
		expect(typeof res[0].id).toBe('string');
	});

	it('estimates PQ storage smaller than float32 baseline at scale', () => {
		const dim = 128;
		const m = 8;
		const k = 16;
		const N = 100_000; // 100k
		const flatBytes = estimateFlatBytes(N, dim);
		const pqBytes = estimatePQBytes(N, dim, m, k);
		// Expect at least ~3x smaller: pqBytes * 3 <= flatBytes
		expect(pqBytes * 3 <= flatBytes).toBe(true);
	});
});
