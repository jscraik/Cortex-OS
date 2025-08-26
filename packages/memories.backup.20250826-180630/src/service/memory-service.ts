import { memoryZ } from "../schemas/memory.zod.js";
import type { MemoryStore } from "../ports/MemoryStore.js";
import type { Embedder } from "../ports/Embedder.js";
import { withSpan } from "../observability/otel.js";
import type { Memory } from "../domain/types.js";

export type MemoryService = {
  save: (raw: unknown) => Promise<Memory>;
  get: (id: string) => Promise<Memory | null>;
  del: (id: string) => Promise<void>;
  search: (q: { text?: string; vector?: number[]; topK?: number; tags?: string[] }) => Promise<Memory[]>;
  purge: (nowISO?: string) => Promise<number>;
};

export const createMemoryService = (store: MemoryStore, embedder?: Embedder): MemoryService => ({
  save: async (raw) => {
    return withSpan("memories.save", async () => {
      const m = memoryZ.parse(raw);
      const needsVector = !m.vector && m.text && embedder;
      const withVec = needsVector
        ? { ...m, vector: (await embedder!.embed([m.text!]))[0], embeddingModel: embedder!.name() }
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
        const v = embedder ? (await embedder.embed([q.text]))[0] : undefined;
        return v ? store.searchByVector({ vector: v, topK, filterTags: q.tags })
                 : store.searchByText({ text: q.text, topK, filterTags: q.tags });
      }
      return [];
    });
  },
  purge: (nowISO) => withSpan("memories.purge", async () => store.purgeExpired(nowISO ?? new Date().toISOString()))
});

