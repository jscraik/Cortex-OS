import type { Chunk, Store } from '../lib/index.js';

export function memoryStore(): Store {
	const items: Array<Chunk & { embedding?: number[] }> = [];
	const base: Store = {
		async upsert(chunks: Chunk[]) {
			for (const c of chunks) {
				const cc = { ...c, updatedAt: c.updatedAt ?? Date.now() } as Chunk;
				const i = items.findIndex((x) => x.id === c.id);
				if (i >= 0) items[i] = cc;
				else items.push(cc);
			}
		},
		async query(embedding: number[], k = 5) {
			function sim(a: number[], b: number[]) {
				if (!a || !b || a.length !== b.length) return 0;
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
			const scored = items
				.filter((x) => Array.isArray(x.embedding))
				.map((x) => ({
					...x,
					updatedAt: x.updatedAt ?? Date.now(),
					score: sim(embedding, x.embedding as number[]),
				}))
				.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
				.slice(0, k);
			return scored;
		},
	};
	// Attach optional admin/list methods (feature-detected by consumers)
	const extended = base as Store & {
		listAll?: () => Promise<Array<Chunk & { embedding?: number[] }>>;
		delete?: (ids: string[]) => Promise<void>;
		countByWorkspace?: (workspaceId: string) => Promise<number>;
		deleteByWorkspace?: (workspaceId: string) => Promise<void>;
	};
	extended.listAll = async () => items.slice();
	extended.delete = async (ids: string[]) => {
		for (const id of ids) {
			const i = items.findIndex((x) => x.id === id);
			if (i >= 0) items.splice(i, 1);
		}
	};
	extended.countByWorkspace = async (workspaceId: string) =>
		items.filter((c) => c.metadata?.workspaceId === workspaceId).length;
	extended.deleteByWorkspace = async (workspaceId: string) => {
		for (let i = items.length - 1; i >= 0; i--) {
			if (items[i].metadata?.workspaceId === workspaceId) items.splice(i, 1);
		}
	};
	return extended;
}
