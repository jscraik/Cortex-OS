import { memoryZ } from "../schemas/memory.zod.js";
import type { MemoryStore } from "../ports/MemoryStore.js";
import type { Embedder } from "../ports/Embedder.js";
import { withSpan } from "../observability/otel.js";
import type { Memory } from "../domain/types.js";
import { CompositeEmbedder } from "../adapters/embedder.composite.js";

export type MemoryService = {
  save: (raw: unknown) => Promise<Memory>;
  get: (id: string) => Promise<Memory | null>;
  del: (id: string) => Promise<void>;
  search: (q: { text?: string; vector?: number[]; topK?: number; tags?: string[] }) => Promise<Memory[]>;
  purge: (nowISO?: string) => Promise<number>;
  // New method to test embedders
  testEmbedders?: () => Promise<Array<{name: string, available: boolean}>>;
};

export const createMemoryService = (store: MemoryStore, embedder?: Embedder): MemoryService => {
  // If no embedder is provided, create a composite embedder
  const effectiveEmbedder = embedder || new CompositeEmbedder();
  
  return {
    save: async (raw) => {
      return withSpan("memories.save", async () => {
        const m = memoryZ.parse(raw);
        const needsVector = !m.vector && m.text && effectiveEmbedder;
        const withVec = needsVector
          ? { ...m, vector: (await effectiveEmbedder.embed([m.text!]))[0], embeddingModel: effectiveEmbedder.name() }
          : m;
        return store.upsert(withVec);
      });
    },
    get: (id) => store.get(id),
    del: (id) => store.delete(id),
    search: async (q) => {
      return withSpan("memories.search", async () => {
        const topK = q.topK ?? 8;
        if (q.vector) return store.searchByVector({ vector: q.vector, topK, filterTags: q.tags });
        if (q.text) {
          const v = effectiveEmbedder ? (await effectiveEmbedder.embed([q.text]))[0] : undefined;
          return v ? store.searchByVector({ vector: v, topK, filterTags: q.tags })
                  : store.searchByText({ text: q.text, topK, filterTags: q.tags });
        }
        return [];
      });
    },
    purge: (nowISO) => withSpan("memories.purge", async () => store.purgeExpired(nowISO ?? new Date().toISOString())),
    // Add embedder testing capability if using composite embedder
    ...(effectiveEmbedder instanceof CompositeEmbedder ? {
      testEmbedders: () => (effectiveEmbedder as CompositeEmbedder).testEmbedders()
    } : {})
  };
};

