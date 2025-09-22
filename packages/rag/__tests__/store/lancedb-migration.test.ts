import { describe, expect, it } from 'vitest';
import type { Chunk } from '../../src/lib/types.js';
import type { LanceDbLike } from '../../src/store/lancedb-store.js';
import { fromAnyListableToLance } from '../../src/store/migration/lancedb-migration.js';

function emb(d = 4) {
	return Array.from({ length: d }, (_, i) => i + 1);
}

class FakeLance implements LanceDbLike {
	rows: Array<{ id: string; vector: number[]; metadata?: Record<string, unknown> }> = [];
	async upsert(items: Array<{ id: string; vector: number[]; metadata?: Record<string, unknown> }>) {
		this.rows.push(...items);
	}
	async query(): Promise<Array<{ id: string; score: number; metadata?: Record<string, unknown> }>> {
		return [];
	}
}

describe('fromAnyListableToLance', () => {
	it('migrates listable source chunks into Lance', async () => {
		const src = {
			async listAll(): Promise<Array<Chunk & { embedding?: number[] }>> {
				return [
					{ id: 'a', text: 'A', embedding: emb(4), metadata: { ws: 'x' } },
					{ id: 'b', text: 'B', embedding: emb(4), metadata: { ws: 'y' } },
				];
			},
		};
		const dst = new FakeLance();
		const result = await fromAnyListableToLance(src, dst, { batchSize: 1 });
		expect(result.migrated).toBe(2);
		expect(dst.rows.length).toBe(2);
	});
});
