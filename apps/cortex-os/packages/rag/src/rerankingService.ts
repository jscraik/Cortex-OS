/**
 * @file_path src/rag/rerankingService.ts
 * Service for reranking search results using model gateway.
 * Integrates with model gateway reranking endpoint.
 */

import { createModelGatewayClient, type ModelGatewayClient } from './modelGateway';

export interface RerankingServiceConfig {
  maxRetries?: number;
  defaultModel?: string;
}

/**
 * Service for reranking search results
 */
export class RerankingService {
  private readonly modelGateway: ModelGatewayClient;
  private readonly config: Required<RerankingServiceConfig>;

  constructor(config: RerankingServiceConfig = {}) {
    this.modelGateway = createModelGatewayClient();
    this.config = {
      maxRetries: 3,
      defaultModel: 'rerank-model',
      ...config,
    };
  }

  /**
   * Rerank documents based on query relevance
   */
  async rerank(
    query: string,
    documents: Array<{ id: string; content: string }>,
  ): Promise<Array<{ id: string; score: number }>> {
    if (documents.length === 0) return [];

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Extract document contents for reranking
        const docContents = documents.map((doc) => doc.content);

        // Call model gateway reranking endpoint
        const response = await this.modelGateway.rerank(query, docContents);

        // Combine results with document IDs
        const rerankedResults = documents.map((doc, index) => ({
          id: doc.id,
          score: response.scores[index] || 0,
        }));

        // Sort by score (higher is better for reranking)
        rerankedResults.sort((a, b) => b.score - a.score);

        return rerankedResults;
      } catch (error) {
        const isLastAttempt = attempt === this.config.maxRetries;
        if (isLastAttempt) {
          console.error(`Reranking failed after ${this.config.maxRetries} attempts:`, error);
          // Fallback: return original order with zero scores
          return documents.map((doc) => ({ id: doc.id, score: 0 }));
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but TypeScript needs it
    return documents.map((doc) => ({ id: doc.id, score: 0 }));
  }

  /**
   * Rerank with document IDs only (for existing retriever interface)
   */
  async rerankByIds(
    query: string,
    documentIds: string[],
    getDocumentContent: (id: string) => Promise<string>,
  ): Promise<string[]> {
    // Fetch document contents
    const documents = await Promise.all(
      documentIds.map(async (id) => ({
        id,
        content: await getDocumentContent(id),
      })),
    );

    // Rerank documents
    const rerankedResults = await this.rerank(query, documents);

    // Return sorted document IDs
    return rerankedResults.map((result) => result.id);
  }
}

/**
 * Create reranking service instance
 */
export function createRerankingService(config?: RerankingServiceConfig): RerankingService {
  return new RerankingService(config);
}
