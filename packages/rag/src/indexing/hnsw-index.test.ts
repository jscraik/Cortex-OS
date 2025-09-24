import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { HNSWIndexOptions, HNSWIndex as HNSWIndexType } from './hnsw-index.js';
import type { VectorIndex } from './vector-index.js';

// Lazy import guard in case hnswlib-node is not available in this environment
type HNSWIndexCtor = new (opts?: HNSWIndexOptions) => HNSWIndexType;
let HNSWIndex: HNSWIndexCtor | null = null;
let hasHnsw = false;
beforeAll(async () => {
	// First, check if native module is resolvable to avoid wrapper import failure
	try {
		const lib = 'hnswlib-node';
		await import(lib);
		const mod = await import('./hnsw-index');
		HNSWIndex = (mod as { HNSWIndex: HNSWIndexCtor }).HNSWIndex;
		hasHnsw = true;
	} catch {
		hasHnsw = false;
	}
});

const maybe = (name: string) => (hasHnsw ? name : `${name} [skipped: hnswlib-node not available]`);

describe('HNSWIndex API parity with VectorIndex', () => {
	it(maybe('supports init/add/query/size like VectorIndex'), async () => {
		if (!hasHnsw) return;
		if (!HNSWIndex) return;
		{
			const idx: VectorIndex = new HNSWIndex({ space: 'cosine', M: 16, efConstruction: 200 });
			await idx.init(3);
			await idx.add('a', [1, 0, 0]);
			await idx.addBatch([
				{ id: 'b', vector: [0, 1, 0] },
				{ id: 'c', vector: [0.9, 0.1, 0] },
			]);
			expect(idx.size()).toBe(3);

			const res = await idx.query([1, 0, 0], 2);
			// Parity expectation: nearest ids are 'a' then 'c'
			expect(res.map((r) => r.id)).toEqual(['a', 'c']);
		}
	});

	it(maybe('supports dynamic updates and persistence (save/load)'), async () => {
		if (!hasHnsw) return;
		const tmp = mkdtempSync(join(tmpdir(), 'hnsw-')); // tmp dir
		try {
			const path = join(tmp, 'index.bin');
			if (!HNSWIndex) return;
			{
				const idx = new HNSWIndex({ space: 'cosine', M: 16, efConstruction: 200 });
				await idx.init(3);
				await idx.add('x', [1, 0, 0]);
				await idx.add('y', [0, 1, 0]);
				await idx.save(path);
				expect(existsSync(path)).toBe(true);

				// Load into a fresh instance and verify contents
				const idx2 = new HNSWIndex({ space: 'cosine', M: 16, efConstruction: 200 });
				await idx2.load(path);
				const res = await idx2.query([1, 0, 0], 1);
				expect(res[0].id).toBe('x');

				// Dynamic update on loaded index
				await idx2.add('z', [0.9, 0.1, 0]);
				const res2 = await idx2.query([1, 0, 0], 2);
				expect(res2.map((r) => r.id)).toEqual(['x', 'z']);
			}
		} finally {
			rmSync(tmp, { recursive: true, force: true });
		}
	});
});
