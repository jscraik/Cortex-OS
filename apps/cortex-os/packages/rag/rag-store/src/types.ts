import type { Chunk, Embedding } from '@cortex-os/rag-contracts/doc';
export interface Store {
  upsertDocs(docs: { doc: any; chunks: Chunk[]; embs: Embedding[] }[]): Promise<void>;
  search(vec: number[], topK: number, filter?: Record<string, unknown>): Promise<{ chunk: Chunk; score: number }[]>;
  getChunk(id: string): Promise<Chunk | undefined>;
}
