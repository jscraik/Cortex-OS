import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Guarded: skip if hnswlib-node is unavailable
async function hasHnsw() {
	try {
		await import('hnswlib-node');
		await import('../hnsw-index');
		return true;
	} catch {
		return false;
	}
}

describe('migration tool', () => {
	it('builds and loads an index from tiny dataset', async () => {
		if (!(await hasHnsw())) return; // skip
		const { migrateFromJson } = await import('../../../tools/migrate-flat-to-hnsw.mjs');
		const { HNSWIndex } = await import('../hnsw-index');

		const dir = mkdtempSync(join(tmpdir(), 'rag-migrate-'));
		const input = join(dir, 'tiny.json');
		const out = join(dir, 'idx');
		const data = [
			{ id: 'a', vector: [0.1, 0.2, 0.3, 0.4] },
			{ id: 'b', vector: [0.2, 0.1, 0.4, 0.3] },
			{ id: 'c', vector: [0.9, 0.1, 0.0, 0.0] },
		];
		writeFileSync(input, JSON.stringify(data));

		await migrateFromJson(input, out, { space: 'l2', M: 8, efConstruction: 100, efSearch: 32 });

		const idx = new HNSWIndex({ space: 'l2', efSearch: 32 });
		await idx.load(out);
		expect(idx.size()).toBe(3);

		const res = await idx.query([0.1, 0.2, 0.3, 0.4], 1);
		expect(res[0].id).toBeDefined();

		rmSync(dir, { recursive: true, force: true });
	});
});
