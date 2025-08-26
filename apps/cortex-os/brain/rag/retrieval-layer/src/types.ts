/**
 * @file_path packages/retrieval-layer/src/types.ts
 * @description Type definitions for retrieval layer with ANN search and reranking
 * @maintainer @cortex-os
 * @last_updated 2025-01-12
 * @version 1.0.0
 * @status active
 */

import { z } from "zod";

// Document metadata schema (allows known fields + extra analytics/chunk keys)
export const DocumentMetadataSchema = z
  .object({
    title: z.string().optional(),
    fileType: z.string().optional(),
    size: z.number().optional(),
    lastModified: z.number().optional(),
    hash: z.string().optional(),
    // chunking-related optional fields
    originalId: z.string().optional(),
    chunkIndex: z.number().optional(),
    startOffset: z.number().optional(),
    endOffset: z.number().optional(),
  })
  .catchall(z.unknown())
  .default({});

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;

// Core document schema
export const DocumentSchema = z.object({
  id: z.string(),
  path: z.string(),
  content: z.string(),
  embedding: z.array(z.number()).optional(),
  metadata: DocumentMetadataSchema,
});

export type Document = z.infer<typeof DocumentSchema>;

// Query result schema
export const QueryResultSchema = z.object({
  id: z.string(),
  document: DocumentSchema,
  score: z.number(),
  rank: z.number().optional(),
});

export type QueryResult = z.infer<typeof QueryResultSchema>;

// Retriever configuration schema
export const RetrieverConfigSchema = z.object({
  dimension: z.number().positive(),
  metric: z.enum(["cosine", "euclidean", "inner_product"]).default("cosine"),
  indexType: z.enum(["faiss", "hnswlib", "sqlite_vss"]).default("faiss"),
  cacheEnabled: z.boolean().default(true),
  maxCacheSize: z.number().positive().default(1000),
});

export type RetrieverConfig = z.infer<typeof RetrieverConfigSchema>;

// Reranker configuration schema
export const RerankerConfigSchema = z.object({
  model: z
    .string()
    .default("sentence-transformers/cross-encoder/ms-marco-MiniLM-L-6-v2"),
  maxCandidates: z.number().positive().default(20),
  topK: z.number().positive().default(10),
  useLocal: z.boolean().default(true),
});

export type RerankerConfig = z.infer<typeof RerankerConfigSchema>;

// Abstract interfaces for retrieval components
export interface Retriever {
  index(documents: Document[]): Promise<void>;
  query(queryVector: number[], topK?: number): Promise<QueryResult[]>;
  getConfig(): RetrieverConfig;
}

export interface Reranker {
  rerank(
    query: string,
    candidates: QueryResult[],
    topK?: number,
  ): Promise<QueryResult[]>;
  getConfig(): RerankerConfig;
}

// Cache interface for incremental indexing
export interface CacheManager {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  size(): Promise<number>;
}

// Evidence tracking schema for validation
export const EvidenceSchema = z.object({
  path: z.string().min(1),
  start: z.number().min(0),
  end: z.number().min(0),
  claim: z.string().min(1),
  hash: z.string().regex(/^[a-f0-9]{12,64}$/),
});

export type Evidence = z.infer<typeof EvidenceSchema>;

// Retrieval system configuration
export const RetrievalSystemConfigSchema = z.object({
  retriever: RetrieverConfigSchema,
  reranker: RerankerConfigSchema,
  embeddings: z.object({
    provider: z.enum(["ollama", "openai", "local"]).default("ollama"),
    model: z.string().default("nomic-embed-text"),
    dimension: z.number().positive().default(768),
  }),
  cache: z.object({
    enabled: z.boolean().default(true),
    maxSize: z.number().positive().default(1000),
    ttl: z.number().positive().default(3600), // 1 hour
  }),
});

export type RetrievalSystemConfig = z.infer<typeof RetrievalSystemConfigSchema>;

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
