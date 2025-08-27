/**
 * @file_path packages/retrieval-layer/src/retrievers/faiss.ts
 * @description FAISS-based retriever implementation
 */

import {
  Retriever,
  Document,
  RetrieverConfig,
  QueryResult,
  DocumentSchema,
} from "../types";

export class FaissRetriever implements Retriever {
  private config: RetrieverConfig;
  private faissIndex: unknown = null;
  private documents: Document[] = [];
  private vectors: number[][] = [];

  constructor(config: RetrieverConfig) {
    this.config = config;
  }

  getConfig(): RetrieverConfig {
    return { ...this.config };
  }

  async index(documents: Document[]): Promise<void> {
    // Validate documents
    documents.forEach((doc) => DocumentSchema.parse(doc));

    this.documents = documents;
    this.vectors = [];

    // Extract embeddings or generate placeholder vectors
    for (const doc of documents) {
      if (doc.embedding && doc.embedding.length === this.config.dimension) {
        this.vectors.push(doc.embedding);
      } else {
        // Generate placeholder embedding for testing
        this.vectors.push(this.generatePlaceholderEmbedding());
      }
    }

    // Initialize FAISS index (mock implementation for now)
    this.faissIndex = {
      dimension: this.config.dimension,
      size: documents.length,
      vectors: this.vectors,
    };
  }

  async query(
    queryVector: number[],
    topK: number = 10,
  ): Promise<QueryResult[]> {
    if (!this.faissIndex || this.documents.length === 0) {
      return [];
    }

    if (queryVector.length !== this.config.dimension) {
      throw new Error(
        `Query vector dimension ${queryVector.length} doesn't match index dimension ${this.config.dimension}`,
      );
    }

    // Calculate similarities (cosine similarity for now)
    const similarities: Array<{ index: number; score: number }> = [];

    for (let i = 0; i < this.vectors.length; i++) {
      const score = this.calculateCosineSimilarity(
        queryVector,
        this.vectors[i],
      );
      similarities.push({ index: i, score });
    }

    // Sort by score (descending) and take top-k
    similarities.sort((a, b) => b.score - a.score);
    const topResults = similarities.slice(
      0,
      Math.min(topK, similarities.length),
    );

    // Convert to QueryResult format
    return topResults.map((result, rank) => ({
      id: this.documents[result.index].id,
      document: this.documents[result.index],
      score: result.score,
      rank: rank + 1,
    }));
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have the same dimension");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  private generatePlaceholderEmbedding(): number[] {
    return Array.from(
      { length: this.config.dimension },
      () => Math.random() - 0.5,
    );
  }
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
