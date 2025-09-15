import type { Memory } from '../domain/types.js';
import { withSpan } from '../observability/otel.js';
import type { Embedder } from '../ports/Embedder.js';
import type { MemoryStore } from '../ports/MemoryStore.js';
import { memoryZ } from '../schemas/memory.zod.js';

export type MemoryService = {
        save: (raw: unknown) => Promise<Memory & { status?: string }>;
        get: (id: string) => Promise<(Memory & { status?: string }) | null>;
        del: (id: string) => Promise<void>;
        search: (q: {
                text?: string;
                vector?: number[];
                topK?: number;
                tags?: string[];
        }) => Promise<Memory[]>;
        list: (opts?: { limit?: number; tags?: string[]; text?: string }) => Promise<Memory[]>;
        purge: (nowISO?: string) => Promise<number>;
	approve?: (id: string) => Promise<void>;
	discard?: (id: string) => Promise<void>;
	listPending?: () => Promise<Array<Memory & { status: 'pending' }>>;
	// New method to test embedders
	testEmbedders?: () => Promise<Array<{ name: string; available: boolean }>>;
};

export const createMemoryService = (
	store: MemoryStore,
	embedder: Embedder,
): MemoryService => {
	if (!embedder) throw new Error('embedder:missing');

	// Pending queue for consent workflow (bounded)
	const MAX_PENDING = 1000;
	const pending = new Map<string, Memory & { status: 'pending' }>();

	// Helper functions to reduce cognitive complexity in search
	const performVectorSearch = async (
		q: { vector: number[]; topK?: number; tags?: string[]; text?: string },
		topK: number,
	) => {
		return store.searchByVector({
			vector: q.vector,
			topK,
			filterTags: q.tags,
			queryText: q.text,
		});
	};

	const performTextSearch = async (
		q: { text: string; topK?: number; tags?: string[] },
		topK: number,
		embedder: Embedder,
		store: MemoryStore,
	) => {
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
	};

	return {
		save: async (raw) => {
			return withSpan('memories.save', async () => {
				const m = memoryZ.parse(raw) as Memory;
				const needsVector = !m.vector && m.text;
				let withVec: Memory;
				if (needsVector) {
					withVec = {
						...m,
						vector: (await embedder.embed([m.text || '']))[0],
						embeddingModel: embedder.name(),
					};
				} else {
					withVec = m;
				}
				if (withVec.policy?.requiresConsent) {
					if (pending.size >= MAX_PENDING) {
						throw new Error(`Pending queue limit (${MAX_PENDING}) exceeded`);
					}
					const pendingMem = { ...withVec, status: 'pending' as const };
					pending.set(withVec.id, pendingMem);
					return pendingMem;
				}
				const saved = await store.upsert(withVec);
				return { ...saved, status: 'approved' };
			});
		},
		get: async (id) => {
			if (pending.has(id)) return null;
			const mem = await store.get(id);
			if (!mem) return null;
			return { ...mem, status: 'approved' };
		},
		del: (id) => {
			pending.delete(id);
			return store.delete(id);
		},
                search: async (q) => {
                        return withSpan('memories.search', async () => {
                                const topK = q.topK ?? 8;

                                if (q.vector) {
                                        return performVectorSearch({ ...q, vector: q.vector }, topK);
                                }

                                if (q.text) {
                                        return performTextSearch(
                                                { ...q, text: q.text },
                                                topK,
                                                embedder,
                                                store,
                                        );
                                }

                                return [];
                        });
                },
                list: async (opts) => {
                        const { limit = 20, tags, text } = opts ?? {};
                        return store.searchByText({
                                text: text ?? '',
                                topK: limit,
                                filterTags: tags,
                        });
                },
                purge: (nowISO) =>
                        withSpan('memories.purge', async () =>
                                store.purgeExpired(nowISO ?? new Date().toISOString()),
                        ),
		approve: async (id) => {
			const mem = pending.get(id);
			if (!mem) return;
			pending.delete(id);
			await store.upsert({ ...mem });
		},
		discard: async (id) => {
			pending.delete(id);
		},
		listPending: async () => Array.from(pending.values()),
	};
};
