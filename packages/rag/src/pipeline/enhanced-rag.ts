import { ChatMessage, GenerationOptions, Generator } from '../generation/multi-model.js';
import { Chunk, Embedder, Store } from '../index.js';
import { RerankDocument, Reranker } from '../pipeline/qwen3-reranker.js';

/**
 * Enhanced RAG pipeline options
 */
export interface EnhancedRAGOptions {
  /** Embedder for creating document and query embeddings */
  embedder: Embedder;
  /** Vector store for storing and retrieving documents */
  store: Store;
  /** Optional reranker for improving retrieval quality */
  reranker?: Reranker;
  /** Generator for creating responses */
  generator?: Generator;
  /** Maximum number of documents to retrieve initially */
  retrievalK?: number;
  /** Maximum number of documents after reranking */
  rerankK?: number;
  /** Maximum context tokens for generation */
  maxContextTokens?: number;
  /** Template for formatting context into prompts */
  promptTemplate?: string;
}

/**
 * Result of enhanced RAG retrieval with optional reranking
 */
export interface EnhancedRetrievalResult {
  /** Retrieved and optionally reranked documents */
  documents: Array<Chunk & { score?: number }>;
  /** Query used for retrieval */
  query: string;
  /** Whether reranking was applied */
  reranked: boolean;
  /** Total processing time in milliseconds */
  processingTime: number;
}

/**
 * Result of RAG generation including context and response
 */
export interface RAGGenerationResult {
  /** Generated response */
  response: string;
  /** Context documents used for generation */
  context: Array<Chunk & { score?: number }>;
  /** Query that generated this response */
  query: string;
  /** Whether reranking was used */
  reranked: boolean;
  /** Total processing time in milliseconds */
  processingTime: number;
  /** Number of tokens in the generated response (estimated) */
  responseTokens?: number;
}

/**
 * Enhanced RAG pipeline with integrated embedding, reranking, and generation
 *
 * Provides a complete RAG workflow with:
 * - High-quality embeddings (Qwen3)
 * - Intelligent reranking (Qwen3-Reranker-4B)
 * - Flexible generation (Multi-model with fallbacks)
 */
export class EnhancedRAGPipeline {
  private readonly embedder: Embedder;
  private readonly store: Store;
  private readonly reranker?: Reranker;
  private readonly generator?: Generator;
  private readonly retrievalK: number;
  private readonly rerankK: number;
  private readonly maxContextTokens: number;
  private readonly promptTemplate: string;

  constructor(options: EnhancedRAGOptions) {
    this.embedder = options.embedder;
    this.store = options.store;
    this.reranker = options.reranker;
    this.generator = options.generator;
    this.retrievalK = options.retrievalK || 20;
    this.rerankK = options.rerankK || 10;
    this.maxContextTokens = options.maxContextTokens || 4096;
    this.promptTemplate = options.promptTemplate || this.getDefaultPromptTemplate();
  }

  /**
   * Ingest documents into the RAG pipeline
   */
  async ingest(chunks: Chunk[]): Promise<void> {
    if (chunks.length === 0) return;

    const texts = chunks.map((c) => c.text);
    const embeddings = await this.embedder.embed(texts);
    const toStore = chunks.map((c, i) => ({ ...c, embedding: embeddings[i] }));
    await this.store.upsert(toStore);
  }

  /**
   * Enhanced retrieve with optional reranking
   */
  async retrieve(query: string): Promise<EnhancedRetrievalResult> {
    const startTime = Date.now();

    // Initial retrieval
    const [embedding] = await this.embedder.embed([query]);
    const initialDocs = await this.store.query(embedding, this.retrievalK);

    let finalDocs = initialDocs;
    let reranked = false;

    // Apply reranking if available
    if (this.reranker && initialDocs.length > 0) {
      const rerankDocs: RerankDocument[] = initialDocs.map((doc) => ({
        id: doc.id,
        text: doc.text,
        score: doc.score,
      }));

      const rerankedDocs = await this.reranker.rerank(query, rerankDocs, this.rerankK);

      // Convert back to Chunk format with scores
      finalDocs = rerankedDocs.map((doc) => {
        const originalDoc = initialDocs.find((d) => d.id === doc.id);
        if (!originalDoc) {
          throw new Error(`Original document not found for reranked doc: ${doc.id}`);
        }
        return {
          ...originalDoc,
          score: doc.score,
        };
      });

      reranked = true;
    }

    const processingTime = Date.now() - startTime;

    return {
      documents: finalDocs,
      query,
      reranked,
      processingTime,
    };
  }

  /**
   * Generate response using retrieved context
   */
  async generate(query: string, options?: GenerationOptions): Promise<RAGGenerationResult> {
    const startTime = Date.now();

    // Retrieve relevant documents
    const retrievalResult = await this.retrieve(query);

    if (!this.generator) {
      throw new Error('Generator not configured for this RAG pipeline');
    }

    // Format context for generation
    const context = this.formatContext(retrievalResult.documents);
    const prompt = this.promptTemplate.replace('{context}', context).replace('{query}', query);

    // Generate response
    const response = await this.generator.generate(prompt, options);

    const processingTime = Date.now() - startTime;
    const responseTokens = this.estimateTokens(response);

    return {
      response,
      context: retrievalResult.documents,
      query,
      reranked: retrievalResult.reranked,
      processingTime,
      responseTokens,
    };
  }

  /**
   * Generate response in chat format
   */
  async chat(messages: ChatMessage[], options?: GenerationOptions): Promise<RAGGenerationResult> {
    const startTime = Date.now();

    // Extract the latest user query for retrieval
    const lastUserMessage = messages.filter((m) => m.role === 'user').slice(-1)[0];
    if (!lastUserMessage) {
      throw new Error('No user message found for RAG retrieval');
    }

    const query = lastUserMessage.content;

    // Retrieve relevant documents
    const retrievalResult = await this.retrieve(query);

    if (!this.generator) {
      throw new Error('Generator not configured for this RAG pipeline');
    }

    // Add context to the conversation
    const context = this.formatContext(retrievalResult.documents);
    const contextMessage: ChatMessage = {
      role: 'system',
      content: `Here is relevant context information:\n\n${context}\n\nPlease use this context to help answer the user's question.`,
    };

    // Insert context before the last user message
    const enhancedMessages = [...messages.slice(0, -1), contextMessage, lastUserMessage];

    // Generate response
    const response = await this.generator.chat(enhancedMessages, options);

    const processingTime = Date.now() - startTime;
    const responseTokens = this.estimateTokens(response);

    return {
      response,
      context: retrievalResult.documents,
      query,
      reranked: retrievalResult.reranked,
      processingTime,
      responseTokens,
    };
  }

  /**
   * Format retrieved documents as context string
   */
  private formatContext(documents: Array<Chunk & { score?: number }>): string {
    if (documents.length === 0) {
      return 'No relevant context found.';
    }

    let context = '';
    let tokenCount = 0;
    const maxTokens = this.maxContextTokens * 0.7; // Reserve space for query and response

    for (const doc of documents) {
      const docText = `[Source: ${doc.source || doc.id}]\n${doc.text}\n\n`;
      const docTokens = this.estimateTokens(docText);

      if (tokenCount + docTokens > maxTokens) {
        break;
      }

      context += docText;
      tokenCount += docTokens;
    }

    return context.trim();
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough approximation: 1 token per 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Get default prompt template
   */
  private getDefaultPromptTemplate(): string {
    return `Context information is below:
{context}

Given the context information and not prior knowledge, answer the query.
Query: {query}
Answer:`;
  }

  /**
   * Get pipeline statistics
   */
  async getStats(): Promise<{
    hasEmbedder: boolean;
    hasReranker: boolean;
    hasGenerator: boolean;
    retrievalK: number;
    rerankK: number;
    maxContextTokens: number;
  }> {
    return {
      hasEmbedder: !!this.embedder,
      hasReranker: !!this.reranker,
      hasGenerator: !!this.generator,
      retrievalK: this.retrievalK,
      rerankK: this.rerankK,
      maxContextTokens: this.maxContextTokens,
    };
  }

  /**
   * Cleanup resources
   */
  async close(): Promise<void> {
    if (this.reranker && typeof (this.reranker as any).close === 'function') {
      await (this.reranker as any).close();
    }
    if (this.generator && typeof (this.generator as any).close === 'function') {
      await (this.generator as any).close();
    }
  }
}

/**
 * Factory function for creating enhanced RAG pipeline
 */
export function createEnhancedRAG(options: EnhancedRAGOptions): EnhancedRAGPipeline {
  return new EnhancedRAGPipeline(options);
}
