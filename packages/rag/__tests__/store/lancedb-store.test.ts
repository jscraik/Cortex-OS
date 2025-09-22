import { describe, expect, it } from 'vitest';
import type { Chunk } from '../../src/lib/types.js';
import { createLanceDbStore, type LanceDbLike } from '../../src/store/lancedb-store.js';

function emb(d = 4) {
	return Array.from({ length: d }, (_, i) => i + 1);
}

class FakeLance implements LanceDbLike {
	rows: Array<{ id: string; vector: number[]; metadata?: Record<string, unknown> }> = [];
	async upsert(items: Array<{ id: string; vector: number[]; metadata?: Record<string, unknown> }>) {
		for (const it of items) {
			const i = this.rows.findIndex((r) => r.id === it.id);
			if (i >= 0) this.rows[i] = it;
			else this.rows.push(it);
		}
	}
	async query(vector: number[], k: number) {
		// naive cosine over local data
		function sim(a: number[], b: number[]) {
			let dot = 0,
				na = 0,
				nb = 0;
			for (let i = 0; i < a.length; i++) {
				dot += a[i] * b[i];
				na += a[i] * a[i];
				nb += b[i] * b[i];
			}
			const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
			return dot / denom;
		}
		return this.rows
			.map((r) => ({ id: r.id, score: sim(vector, r.vector), metadata: r.metadata }))
			.sort((a, b) => b.score - a.score)
			.slice(0, k);
	}
	async delete(ids: string[]) {
		this.rows = this.rows.filter((r) => !ids.includes(r.id));
	}
	async listAll() {
		return this.rows.map((r) => ({ id: r.id, vector: r.vector, metadata: r.metadata }));
	}
}

describe('LanceDbStore', () => {
	it('conforms to Store upsert/query', async () => {
		const client = new FakeLance();
		const store = createLanceDbStore(client, { dimensions: 4 });

		const a: Chunk = { id: 'a', text: 'A', embedding: emb(4), metadata: { t: 1 } };
		const b: Chunk = { id: 'b', text: 'B', embedding: emb(4), metadata: { t: 2 } };
		await store.upsert([a, b]);

		const res = await store.query(emb(4), 2);
		expect(res.length).toBe(2);
		expect(res[0].id).toBeDefined();
	});

	it('supports optional list/delete hooks', async () => {
		const client = new FakeLance();
		const store = createLanceDbStore(client, { dimensions: 4 }) as any;

		const c: Chunk = { id: 'c', text: 'C', embedding: emb(4) };
		await store.upsert([c]);

		const all = await store.listAll();
		expect(all.length).toBeGreaterThan(0);

		await store.delete(['c']);
		const all2 = await store.listAll();
		expect(all2.find((x: any) => x.id === 'c')).toBeUndefined();
	});
});
