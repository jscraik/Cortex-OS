import { Qwen3Embedder } from './embed/qwen3';
import { MultiModelGenerator, type ModelSpec } from './generation/multi-model';
import { Qwen3Reranker } from './pipeline/qwen3-reranker';

/**
 * Extended document type with embedding support
 */
export interface Document {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
  similarity?: number;
}

/**
 * Configuration for enhanced RAG pipeline
 */
export interface EnhancedRAGConfig {
  /** Embedding model size (0.6B, 4B, or 8B) */
  embeddingModelSize?: '0.6B' | '4B' | '8B';
  /** Generation model specification */
  generationModel: ModelSpec;
  /** Top-k documents to retrieve */
  topK?: number;
  /** Reranking configuration */
  rerank?: {
    enabled: boolean;
    topK?: number;
  };
}

/**
 * Enhanced RAG pipeline
 *
 * Features:
 * - Qwen3 embedding models (configurable sizes)
 * - Qwen3 reranking for improved relevance
 * - Configurable generation model
 * - Comprehensive error handling and performance tracking
 */
export class EnhancedRAGPipeline {
  private readonly embedder: Qwen3Embedder;
  private readonly reranker: Qwen3Reranker;
  private readonly generator: MultiModelGenerator;
  private readonly config: Required<EnhancedRAGConfig>;

  constructor(config: EnhancedRAGConfig) {
    this.config = {
      embeddingModelSize: '4B',
      topK: 10,
      rerank: { enabled: true, topK: 5 },
      ...config,
    };

    // Initialize components with MLX preference
    this.embedder = new Qwen3Embedder({ modelSize: this.config.embeddingModelSize });
    this.reranker = new Qwen3Reranker();
    this.generator = new MultiModelGenerator({
      model: this.config.generationModel,
      defaultConfig: {
        maxTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
      },
      timeout: 30000,
    });
  }

  /**
   * Process a query with enhanced RAG pipeline
   */
  async query(
    query: string,
    documents: Document[],
    options?: {
      contextPrompt?: string;
      maxContextLength?: number;
    },
  ) {
    const startTime = Date.now();

    try {
      // Step 1: Embed the query
      const [queryEmbedding] = await this.embedder.embed([query]);

      // Step 2: Retrieve relevant documents (simplified similarity search)
      const retrievedDocs = await this.retrieveDocuments(queryEmbedding, documents);

      // Step 3: Rerank if enabled
      let finalDocs = retrievedDocs;
      if (this.config.rerank.enabled) {
        // Convert documents to reranker format
        const rerankDocs = retrievedDocs.map((doc) => ({
          id: doc.id,
          text: doc.content,
        }));
        const rerankedDocs = await this.reranker.rerank(query, rerankDocs, this.config.rerank.topK);
        // Convert back to document format
        finalDocs = rerankedDocs.map((doc) => ({
          id: doc.id,
          content: doc.text,
          metadata: retrievedDocs.find((original) => original.id === doc.id)?.metadata,
          similarity: doc.score,
        }));
      }

      // Step 4: Generate response with context
      const context = this.buildContext(finalDocs, options?.maxContextLength);
      const prompt = this.buildPrompt(query, context, options?.contextPrompt);

      const response = await this.generator.generate(prompt, {
        maxTokens: 2048,
        temperature: 0.7,
      });

      const endTime = Date.now();

      return {
        answer: response.content,
        provider: response.provider,
        context: finalDocs,
        retrievedCount: retrievedDocs.length,
        rerankedCount: finalDocs.length,
        processingTimeMs: endTime - startTime,
        usage: response.usage,
      };
    } catch (error) {
      throw new Error(`Enhanced RAG pipeline failed: ${error}`);
    }
  }

  /**
   * Simplified document retrieval using cosine similarity
   */
  private async retrieveDocuments(
    queryEmbedding: number[],
    documents: Document[],
  ): Promise<Document[]> {
    const scoredDocs = await Promise.all(
      documents.map(async (doc) => {
        // Embed document if not already embedded
        if (!doc.embedding) {
          const [embedding] = await this.embedder.embed([doc.content]);
          doc.embedding = embedding;
        }

        // Calculate cosine similarity
        const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
        return { ...doc, similarity };
      }),
    );

    // Sort by similarity and take top-k
    scoredDocs.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    return scoredDocs.slice(0, this.config.topK);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Build context from documents
   */
  private buildContext(documents: Document[], maxLength?: number): string {
    const contexts = documents.map((doc, index) => `[Document ${index + 1}]\n${doc.content}\n`);

    let context = contexts.join('\n');

    if (maxLength && context.length > maxLength) {
      context = context.substring(0, maxLength) + '...';
    }

    return context;
  }

  /**
   * Build the final prompt with context
   */
  private buildPrompt(query: string, context: string, customPrompt?: string): string {
    const systemPrompt =
      customPrompt ||
      `You are a helpful AI assistant. Answer the user's question based on the provided context. If the context doesn't contain enough information to answer the question, say so clearly.`;

    return `${systemPrompt}

Context:
${context}

Question: ${query}

Answer:`;
  }

}

// Example usage and factory functions
export const createProductionRAGPipeline = () => {
  return new EnhancedRAGPipeline({
    embeddingModelSize: '4B', // Good balance of performance and quality
    generationModel: {
      model: '/Volumes/SSD500/Models/MLX/qwen2.5-coder-32b-instruct-q4',
      backend: 'mlx',
      name: 'Qwen2.5 Coder 32B',
    },
    topK: 10,
    rerank: { enabled: true, topK: 5 },
  });
};

export const createFastRAGPipeline = () => {
  return new EnhancedRAGPipeline({
    embeddingModelSize: '0.6B', // Faster embedding
    generationModel: {
      model: '/Volumes/SSD500/Models/MLX/phi-3.5-mini-instruct-q4',
      backend: 'mlx',
      name: 'Phi-3.5 Mini',
    },
    topK: 5,
    rerank: { enabled: false }, // Skip reranking for speed
  });
};

export const createHighQualityRAGPipeline = () => {
  return new EnhancedRAGPipeline({
    embeddingModelSize: '8B', // Best embedding quality
    generationModel: {
      model: '/Volumes/SSD500/Models/MLX/qwen2.5-72b-instruct-q4',
      backend: 'mlx',
      name: 'Qwen2.5 72B',
    },
    topK: 15,
    rerank: { enabled: true, topK: 8 }, // More comprehensive reranking
  });
};
