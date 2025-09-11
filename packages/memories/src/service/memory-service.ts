import { CompositeEmbedder } from '../adapters/embedder.composite.js';
import type { Memory } from '../domain/types.js';
import { withSpan } from '../observability/otel.js';
import type { Embedder } from '../ports/Embedder.js';
import type { MemoryStore } from '../ports/MemoryStore.js';
import { memoryZ } from '../schemas/memory.zod.js';

export type MemoryService = {
	save: (raw: unknown) => Promise<Memory>;
	get: (id: string) => Promise<Memory | null>;
	del: (id: string) => Promise<void>;
	search: (q: {
		text?: string;
		vector?: number[];
		topK?: number;
		tags?: string[];
	}) => Promise<Memory[]>;
	purge: (nowISO?: string) => Promise<number>;
	// New method to test embedders
	testEmbedders?: () => Promise<Array<{ name: string; available: boolean }>>;
	listPending: () => Promise<Memory[]>;
	approve: (id: string) => Promise<Memory | null>;
	discard: (id: string) => Promise<void>;
};

export const createMemoryService = (
	store: MemoryStore,
	embedder: Embedder,
): MemoryService => {
	if (!embedder) throw new Error('embedder:missing');

	const pending = new Map<string, Memory>();

	return {
		save: async (raw) => {
			return withSpan('memories.save', async () => {
				const m = memoryZ.parse(raw) as Memory;
				const needsVector = !m.vector && m.text;
				let withVec: Memory;
				if (needsVector) {
					withVec = {
						...m,
						vector: (await embedder.embed([m.text!]))[0],
						embeddingModel: embedder.name(),
					};
				} else {
					withVec = m;
				}
				if (withVec.policy?.requiresConsent) {
					const pendingMem = { ...withVec, status: 'pending' as const };
					pending.set(pendingMem.id, pendingMem);
					return pendingMem;
				}
				return store.upsert({ ...withVec, status: 'approved' });
			});
		},
		get: async (id) => {
			const pendingMem = pending.get(id);
			if (pendingMem) return pendingMem;
			return store.get(id);
		},
		del: (id) => store.delete(id),
		search: async (q) => {
			return withSpan('memories.search', async () => {
				const topK = q.topK ?? 8;
				if (q.vector) {
					return store.searchByVector({
						vector: q.vector,
						topK,
						filterTags: q.tags,
						queryText: q.text,
					});
				}
				if (q.text) {
					const textResults = await store.searchByText({
						text: q.text,
						topK,
						filterTags: q.tags,
					});
					if (textResults.length < topK) {
						try {
							const v = (await embedder.embed([q.text]))[0];
							const vecResults = await store.searchByVector({
								vector: v,
								topK,
								filterTags: q.tags,
								queryText: q.text,
							});
							const seen = new Set(textResults.map((m) => m.id));
							for (const m of vecResults) {
								if (!seen.has(m.id)) textResults.push(m);
								if (textResults.length >= topK) break;
							}
						} catch (err) {
							throw err instanceof Error ? err : new Error('embedding:failed');
						}
					}
					return textResults;
				}
				return [];
			});
		},
		purge: (nowISO) =>
			withSpan('memories.purge', async () =>
				store.purgeExpired(nowISO ?? new Date().toISOString()),
			),
		listPending: async () => [...pending.values()],
		approve: async (id) => {
			const m = pending.get(id);
			if (!m) return null;
			pending.delete(id);
			const saved = await store.upsert({ ...m, status: 'approved' });
			return saved;
		},
		discard: async (id) => {
			pending.delete(id);
		},
		...(embedder instanceof CompositeEmbedder
			? {
					testEmbedders: () => (embedder as CompositeEmbedder).testEmbedders(),
				}
			: {}),
	};
};
