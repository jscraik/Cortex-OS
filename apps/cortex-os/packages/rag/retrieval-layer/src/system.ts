/**
 * @file_path packages/retrieval-layer/src/system.ts
 * @description Main retrieval system orchestrating retrieval and reranking
 */

import {
  Document,
  QueryResult,
  RetrievalSystemConfig,
  Retriever,
  Reranker,
  CacheManager,
} from "./types";
import { FaissRetriever } from "./retrievers/faiss";
import { LocalReranker } from "./rerankers/local";
import { MemoryCacheManager } from "./cache/memory";
import { IncrementalIndexCache } from "./cache/incremental";

export class RetrievalSystem {
  private retriever: Retriever;
  private reranker: Reranker;
  private cache: CacheManager;
  private incrementalCache: IncrementalIndexCache;
  private config: RetrievalSystemConfig;

  constructor(config: RetrievalSystemConfig) {
    this.config = config;

    // Initialize retriever
    this.retriever = new FaissRetriever({
      dimension: config.embeddings.dimension,
      metric: "cosine",
      indexType: "faiss",
      cacheEnabled: config.cache.enabled,
      maxCacheSize: config.cache.maxSize,
    });

    // Initialize reranker
    this.reranker = new LocalReranker({
      model: "local-reranker",
      maxCandidates: 20,
      topK: 10,
      useLocal: true,
    });

    // Initialize cache
    this.cache = new MemoryCacheManager({
      maxSize: config.cache.maxSize,
      ttl: config.cache.ttl,
    });

    // Initialize incremental cache
    this.incrementalCache = new IncrementalIndexCache(".cortex-cache");
  }

  async indexDocuments(documents: Document[]): Promise<void> {
    // Generate embeddings if not present
    const documentsWithEmbeddings = await this.ensureEmbeddings(documents);

    // Index documents in retriever
    await this.retriever.index(documentsWithEmbeddings);

    // Cache indexed documents
    if (this.config.cache.enabled) {
      for (const doc of documentsWithEmbeddings) {
        const cacheKey = `doc:${doc.id}`;
        await this.cache.set(cacheKey, doc, this.config.cache.ttl);
      }

      // Save to incremental cache
      await this.incrementalCache.saveCachedDocuments(documentsWithEmbeddings);
    }
  }

  /**
   * Index documents incrementally, only processing changed files
   */
  async indexDocumentsIncremental(
    documents: Document[],
    filePaths: string[],
  ): Promise<{
    totalDocuments: number;
    changedDocuments: number;
    skippedDocuments: number;
    indexingTime: number;
  }> {
    const startTime = Date.now();

    // Initialize incremental cache
    await this.incrementalCache.initialize();

    // Get changed files
    const changes = await this.incrementalCache.getChangedFiles(filePaths);

    // Filter documents to only include changed files
    const changedDocuments = documents.filter(
      (doc) =>
        changes.changed.includes(doc.path) ||
        changes.changed.some((changedPath) => doc.path.includes(changedPath)),
    );

    // Load existing cached documents for unchanged files
    const allDocuments: Document[] = [];
    if (changes.unchanged.length > 0) {
      const cachedDocuments = await this.incrementalCache.loadCachedDocuments();
      const unchangedCached = cachedDocuments.filter((doc) =>
        changes.unchanged.some((unchangedPath) =>
          doc.path.includes(unchangedPath),
        ),
      );
      allDocuments.push(...unchangedCached);
    }

    // Add changed documents
    allDocuments.push(...changedDocuments);

    // Index all documents (changed + cached unchanged)
    if (allDocuments.length > 0) {
      await this.indexDocuments(allDocuments);
    }

    // Update file manifest
    await this.incrementalCache.updateManifest(filePaths);

    const indexingTime = Date.now() - startTime;

    return {
      totalDocuments: allDocuments.length,
      changedDocuments: changedDocuments.length,
      skippedDocuments: changes.unchanged.length,
      indexingTime,
    };
  }

  async search(
    query: string,
    queryEmbedding: number[],
    topK: number = 10,
  ): Promise<QueryResult[]> {
    // Check cache first
    const cacheKey = `query:${this.hashQuery(query)}:${topK}`;
    if (this.config.cache.enabled) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Retrieve candidates from ANN index
    const candidates = await this.retriever.query(
      queryEmbedding,
      Math.min(topK * 2, 50),
    );

    // Rerank candidates based on query
    const reranked = await this.reranker.rerank(query, candidates, topK);

    // Cache results
    if (this.config.cache.enabled) {
      await this.cache.set(cacheKey, reranked, this.config.cache.ttl);
    }

    return reranked;
  }

  async getDocumentById(id: string): Promise<Document | null> {
    const cacheKey = `doc:${id}`;
    return await this.cache.get(cacheKey);
  }

  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  getConfig(): RetrievalSystemConfig {
    return { ...this.config };
  }

  /**
   * Get incremental cache statistics
   */
  getCacheStats() {
    return this.incrementalCache.getCacheStats();
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    await this.cache.clear();
    await this.incrementalCache.clearCache();
  }

  private async ensureEmbeddings(documents: Document[]): Promise<Document[]> {
    return documents.map((doc) => {
      if (
        !doc.embedding ||
        doc.embedding.length !== this.config.embeddings.dimension
      ) {
        // Generate placeholder embedding for now
        // In production, this would call the embedding service
        doc.embedding = this.generatePlaceholderEmbedding();
      }
      return doc;
    });
  }

  private generatePlaceholderEmbedding(): number[] {
    const dim = this.config.embeddings.dimension;
    return Array.from({ length: dim }, () => Math.random() - 0.5);
  }

  private hashQuery(query: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
