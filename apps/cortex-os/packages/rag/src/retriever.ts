import { createModelGatewayClient, type ModelGatewayClient } from './modelGateway';
import { createRerankingService, type RerankingService } from './rerankingService';
import { getSingleDim, searchByEmbedding } from './vectorStore';

export interface Retriever {
  search(q: string, k: number): Promise<{ chunkId: string; score: number }[]>;
}

export interface HybridRetrieverDeps {
  bm25: (q: string, k: number) => Promise<{ chunkId: string; score: number }[]>;
  vector: (q: string, k: number) => Promise<{ chunkId: string; score: number }[]>;
  rerank?: (q: string, ids: string[]) => Promise<string[]>;
  useRerank?: boolean;
  getDocumentContent?: (id: string) => Promise<string>;
}

export class HybridRetriever implements Retriever {
  private readonly modelGateway: ModelGatewayClient;
  private readonly rerankingService: RerankingService;
  private readonly embeddingDim: number;

  constructor(private readonly deps: HybridRetrieverDeps) {
    this.modelGateway = createModelGatewayClient();
    this.rerankingService = createRerankingService();
    this.embeddingDim = getSingleDim();
  }

  async search(q: string, k: number) {
    const [bm25Results, vectorResults] = await Promise.all([
      this.deps.bm25(q, k),
      this.vectorSearch(q, k),
    ]);

    // Simple hybrid merge by normalized rank
    const map = new Map<string, number>();
    const add = (arr: { chunkId: string; score: number }[], w: number) =>
      arr.forEach((it, i) => map.set(it.chunkId, (map.get(it.chunkId) || 0) + w / (1 + i)));

    add(bm25Results, 1.0);
    add(vectorResults, 1.0);

    const merged = Array.from(map.entries())
      .map(([chunkId, score]) => ({ chunkId, score }))
      .sort((x, y) => y.score - x.score)
      .slice(0, k);

    // Apply reranking if enabled
    if (this.deps.useRerank && this.deps.getDocumentContent) {
      const ids = merged.map((m) => m.chunkId);
      const rerankedIds = await this.rerankingService.rerankByIds(
        q,
        ids,
        this.deps.getDocumentContent,
      );

      // Reorder merged results based on reranking
      const rank = new Map(rerankedIds.map((id, i) => [id, i] as const));
      merged.sort((x, y) => (rank.get(x.chunkId) || 0) - (rank.get(y.chunkId) || 0));
    } else if (this.deps.useRerank && this.deps.rerank) {
      // Fallback to original rerank function if available
      const ids = merged.map((m) => m.chunkId);
      const order = await this.deps.rerank(q, ids);
      const rank = new Map(order.map((id, i) => [id, i] as const));
      merged.sort((x, y) => (rank.get(x.chunkId) || 0) - (rank.get(y.chunkId) || 0));
    }

    return merged;
  }

  /**
   * Vector search using model gateway for embedding generation
   */
  private async vectorSearch(
    query: string,
    k: number,
  ): Promise<{ chunkId: string; score: number }[]> {
    try {
      // Generate embedding using model gateway
      const embeddingResponse = await this.modelGateway.generateEmbedding(query);
      const queryEmbedding = embeddingResponse.embedding;

      // Validate embedding dimensions
      if (queryEmbedding.length !== this.embeddingDim) {
        console.warn(
          `Embedding dimension mismatch: got ${queryEmbedding.length}, expected ${this.embeddingDim}`,
        );
      }

      // Search vector store
      return await searchByEmbedding(queryEmbedding, k);
    } catch (error) {
      console.error('Vector search failed:', error);
      // Fallback to empty results if embedding generation fails
      return [];
    }
  }
}
