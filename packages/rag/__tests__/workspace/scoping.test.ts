import { describe, expect, it } from 'vitest';
import type { Chunk, Store } from '../../src/lib/types.js';
import { memoryStore } from '../../src/store/memory.js';
import { createScopedStore } from '../../src/workspace/scoped-store.js';

function mockEmbedding(dim = 4) {
	return Array.from({ length: dim }, (_, i) => (i + 1) / dim);
}

function chunk(id: string, text: string, ws?: string): Chunk {
	return { id, text, metadata: ws ? { workspaceId: ws } : {} };
}

describe('ScopedStore', () => {
	it('isolates data between workspaces', async () => {
		const base = memoryStore();
		const wsA = createScopedStore(base, { workspaceId: 'A' });
		const wsB = createScopedStore(base, { workspaceId: 'B' });

		const emb = mockEmbedding();
		await wsA.upsert([
			{ ...chunk('1', 'alpha'), embedding: emb },
			{ ...chunk('2', 'bravo'), embedding: emb },
		]);
		await wsB.upsert([{ ...chunk('3', 'charlie'), embedding: emb }]);

		const resA = await wsA.query(emb, 10);
		const resB = await wsB.query(emb, 10);

		const idsA = resA.map((r) => r.id).sort();
		const idsB = resB.map((r) => r.id).sort();

		expect(idsA).toEqual(['1', '2']);
		expect(idsB).toEqual(['3']);
	});

	it('stamps workspaceId on upsert when missing', async () => {
		const base = memoryStore();
		const ws = createScopedStore(base, { workspaceId: 'X' });
		const emb = mockEmbedding();
		await ws.upsert([{ id: 'z', text: 'zulu', embedding: emb }]);

		const res = await ws.query(emb, 10);
		expect(res.length).toBe(1);
		expect(res[0].metadata?.workspaceId).toBe('X');
	});

	it('enforces quota when countByWorkspace is available', async () => {
		// Extend memory store with a trivial countByWorkspace for test purposes
		const items: Array<Chunk & { embedding?: number[] }> = [];
		const base: Store & { countByWorkspace?: (ws: string) => Promise<number> } = {
			async upsert(chunks: Chunk[]) {
				for (const c of chunks) {
					const cc = { ...c } as Chunk;
					const i = items.findIndex((x) => x.id === c.id);
					if (i >= 0) items[i] = cc;
					else items.push(cc);
				}
			},
			async query(e: number[], k = 5) {
				return items.slice(0, k);
			},
			async countByWorkspace(ws: string) {
				return items.filter((c) => c.metadata?.workspaceId === ws).length;
			},
		};

		const ws = createScopedStore(base, { workspaceId: 'Q', quota: { maxItems: 1 } });
		const emb = mockEmbedding();
		await ws.upsert([{ id: 'a', text: 'one', embedding: emb }]);
		await expect(ws.upsert([{ id: 'b', text: 'two', embedding: emb }])).rejects.toThrow(
			/quota exceeded/i,
		);
	});
});
