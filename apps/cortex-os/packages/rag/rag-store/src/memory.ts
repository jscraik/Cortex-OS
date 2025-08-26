import type { Store } from './types.js';
import type { Chunk } from '@cortex-os/rag-contracts/doc';
const L2 = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
export function memoryStore(): Store {
  const chunks = new Map<string, Chunk>();
  const embs = new Map<string, number[]>();
  return {
    async upsertDocs(items) {
      for (const it of items) {
        for (const c of it.chunks) chunks.set(c.id, c);
        for (const e of it.embs) embs.set(e.chunkId, e.vec);
      }
    },
    async search(vec, topK) {
      const arr = [...embs.entries()].map(([id, v]) => ({ id, d: L2(v, vec) }));
      arr.sort((a, b) => a.d - b.d);
      return arr.slice(0, topK).map(({ id, d }) => ({ chunk: chunks.get(id)!, score: 1 / (1 + d) }));
    },
    async getChunk(id) {
      return chunks.get(id);
    },
  };
}
