export type Chunk = {
  id: string;
  text: string;
  source?: string;
  meta?: Record<string, unknown>;
};

export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
}

export interface Store {
  upsert(chunks: (Chunk & { embedding?: number[] })[]): Promise<void>;
  query(embedding: number[], k?: number): Promise<Array<Chunk & { score?: number }>>;
}

export interface RAGOptions {
  embedder: Embedder;
  store: Store;
  maxContextTokens?: number;
}

export class RAGPipeline {
  constructor(private readonly opts: RAGOptions) {}

  async ingest(chunks: Chunk[]): Promise<void> {
    const texts = chunks.map((c) => c.text);
    const embeddings = await this.opts.embedder.embed(texts);
    if (embeddings.length !== chunks.length) {
      throw new Error(
        `Embedding count (${embeddings.length}) does not match chunk count (${chunks.length})`,
      );
    }
    const toStore = chunks.map((c, i) => ({ ...c, embedding: embeddings[i] }));
    await this.opts.store.upsert(toStore);
  }

  async retrieve(query: string, k = 5): Promise<Array<Chunk & { score?: number }>> {
    const [embedding] = await this.opts.embedder.embed([query]);
    return this.opts.store.query(embedding, k);
  }
}

// Re-export policy and dispatcher for consumers needing planning/dispatch layer
export * from './chunkers';
export * as Policy from './policy';

// Export reranking interfaces and implementations
export * from './pipeline/qwen3-reranker';

// Export generation interfaces and implementations
export * from './generation/multi-model';

// Export enhanced RAG pipeline factory and helpers
export * from './enhanced-pipeline';
export * from './lib';

// Export embedding implementations
export * from './embed/qwen3';
