/**
 * @file_path src/rag/embeddingService.ts
 * Service for generating and managing embeddings during RAG ingestion.
 * Integrates with model gateway for embedding generation.
 */

import type { DocumentChunk } from './chunkers/dispatch';
import { createModelGatewayClient, type ModelGatewayClient } from './modelGateway';
import { setChunkEmbedding, validateEmbedding } from './vectorStore';

export interface EmbeddingServiceConfig {
  batchSize?: number;
  maxRetries?: number;
  enableParallel?: boolean;
}

/**
 * Service for generating embeddings for document chunks
 */
export class EmbeddingService {
  private readonly modelGateway: ModelGatewayClient;
  private readonly config: Required<EmbeddingServiceConfig>;

  constructor(config: EmbeddingServiceConfig = {}) {
    this.modelGateway = createModelGatewayClient();
    this.config = {
      batchSize: 10,
      maxRetries: 3,
      enableParallel: true,
      ...config,
    };
  }

  /**
   * Generate and store embeddings for document chunks
   */
  async embedChunks(chunks: DocumentChunk[]): Promise<void> {
    if (chunks.length === 0) return;

    if (this.config.enableParallel && chunks.length > this.config.batchSize) {
      await this.embedChunksParallel(chunks);
    } else {
      await this.embedChunksSequential(chunks);
    }
  }

  /**
   * Embed chunks sequentially (better for memory management)
   */
  private async embedChunksSequential(chunks: DocumentChunk[]): Promise<void> {
    for (const chunk of chunks) {
      await this.embedSingleChunk(chunk);
    }
  }

  /**
   * Embed chunks in parallel with batching
   */
  private async embedChunksParallel(chunks: DocumentChunk[]): Promise<void> {
    const batches = this.createBatches(chunks, this.config.batchSize);

    for (const batch of batches) {
      await Promise.all(batch.map((chunk) => this.embedSingleChunk(chunk)));
    }
  }

  /**
   * Generate and store embedding for a single chunk
   */
  private async embedSingleChunk(chunk: DocumentChunk): Promise<void> {
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Generate embedding using model gateway
        const embeddingResponse = await this.modelGateway.generateEmbedding(chunk.content);
        const embedding = validateEmbedding(embeddingResponse.embedding);

        // Store embedding in vector database
        await setChunkEmbedding(chunk.id, embedding);
        return;
      } catch (error) {
        const isLastAttempt = attempt === this.config.maxRetries;
        if (isLastAttempt) {
          console.error(
            `Failed to embed chunk ${chunk.id} after ${this.config.maxRetries} attempts:`,
            error,
          );
          throw error;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Create batches of chunks for parallel processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Generate embedding for text without storing (for queries)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.modelGateway.generateEmbedding(text);
    return validateEmbedding(response.embedding);
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const responses = await this.modelGateway.generateEmbeddings(texts);
    return responses.map((response) => validateEmbedding(response.embedding));
  }
}

/**
 * Create embedding service instance
 */
export function createEmbeddingService(config?: EmbeddingServiceConfig): EmbeddingService {
  return new EmbeddingService(config);
}
