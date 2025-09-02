import { CompositeEmbedder } from "../adapters/embedder.composite.js";
import type { Memory } from "../domain/types.js";
import { withSpan } from "../observability/otel.js";
import type { Embedder } from "../ports/Embedder.js";
import type { MemoryStore } from "../ports/MemoryStore.js";
import { memoryZ } from "../schemas/memory.zod.js";

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
};

export const createMemoryService = (
	store: MemoryStore,
	embedder: Embedder,
): MemoryService => {
	if (!embedder) throw new Error("embedder:missing");

	return {
		save: async (raw) => {
			return withSpan("memories.save", async () => {
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
				return store.upsert(withVec);
			});
		},
		get: (id) => store.get(id),
		del: (id) => store.delete(id),
		search: async (q) => {
			return withSpan("memories.search", async () => {
				const topK = q.topK ?? 8;
				if (q.vector) {
					return store.searchByVector({
						vector: q.vector,
						topK,
						filterTags: q.tags,
					});
				}
				if (q.text) {
					const v = (await embedder.embed([q.text]))[0];
					return store.searchByVector({ vector: v, topK, filterTags: q.tags });
				}
				return [];
			});
		},
		purge: (nowISO) =>
			withSpan("memories.purge", async () =>
				store.purgeExpired(nowISO ?? new Date().toISOString()),
			),
		...(embedder instanceof CompositeEmbedder
			? {
					testEmbedders: () => (embedder as CompositeEmbedder).testEmbedders(),
				}
			: {}),
	};
};
