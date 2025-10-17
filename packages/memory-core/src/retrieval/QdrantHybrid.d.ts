/**
 * Qdrant Hybrid Search Integration for brAInwav GraphRAG
 *
 * This module provides hybrid dense+sparse vector search using the existing
 * Qdrant infrastructure from the active brAInwav memory stack, ensuring
 * seamless integration with the current memory-core architecture.
 *
 * Features:
 * - Integration with existing Qdrant collection (local_memory_v1)
 * - Hybrid search combining dense and sparse vectors
 * - brAInwav branding compliance in all outputs
 * - Reuses existing QdrantClient patterns from memory-core
 */
import { z } from 'zod';
export interface SparseVector {
    indices: number[];
    values: number[];
}
export declare const QdrantConfigSchema: z.ZodObject<{
    url: z.ZodDefault<z.ZodString>;
    apiKey: z.ZodOptional<z.ZodString>;
    collection: z.ZodDefault<z.ZodString>;
    timeout: z.ZodDefault<z.ZodNumber>;
    maxRetries: z.ZodDefault<z.ZodNumber>;
    brainwavBranding: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    timeout?: number;
    url?: string;
    apiKey?: string;
    collection?: string;
    maxRetries?: number;
    brainwavBranding?: boolean;
}, {
    timeout?: number;
    url?: string;
    apiKey?: string;
    collection?: string;
    maxRetries?: number;
    brainwavBranding?: boolean;
}>;
export type QdrantConfig = z.infer<typeof QdrantConfigSchema>;
export declare const GraphRAGQueryParamsSchema: z.ZodObject<{
    question: z.ZodString;
    k: z.ZodDefault<z.ZodNumber>;
    threshold: z.ZodOptional<z.ZodNumber>;
    includeVectors: z.ZodDefault<z.ZodBoolean>;
    namespace: z.ZodOptional<z.ZodString>;
    filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    question?: string;
    k?: number;
    threshold?: number;
    includeVectors?: boolean;
    namespace?: string;
    filters?: Record<string, any>;
}, {
    question?: string;
    k?: number;
    threshold?: number;
    includeVectors?: boolean;
    namespace?: string;
    filters?: Record<string, any>;
}>;
export type GraphRAGQueryParams = z.infer<typeof GraphRAGQueryParamsSchema>;
export interface GraphRAGSearchResult {
    id: string;
    score: number;
    nodeId: string;
    chunkContent: string;
    metadata: {
        path: string;
        nodeType: string;
        nodeKey: string;
        lineStart?: number;
        lineEnd?: number;
        brainwavSource: string;
        relevanceScore: number;
        [key: string]: any;
    };
    vector?: number[];
}
/**
 * Qdrant Hybrid Search implementation for brAInwav GraphRAG
 * Integrates with existing Qdrant infrastructure from memory-core
 */
export declare class QdrantHybridSearch {
    private client;
    private config;
    private embedDense;
    private embedSparse;
    private localCache;
    private readonly LOCAL_CACHE_TTL;
    private readonly MAX_LOCAL_CACHE_SIZE;
    private distributedCache;
    constructor(config: QdrantConfig);
    /**
     * Initialize Qdrant connection using existing brAInwav patterns
     */
    initialize(embedDenseFunc: (text: string) => Promise<number[]>, embedSparseFunc: (text: string) => Promise<SparseVector>): Promise<void>;
    /**
     * Perform hybrid search using Qdrant's multi-vector capabilities with multi-level caching
     */
    hybridSearch(params: GraphRAGQueryParams): Promise<GraphRAGSearchResult[]>;
    private cacheResults;
    /**
     * Add chunks to the existing Qdrant collection
     */
    addChunks(chunks: {
        id: string;
        nodeId: string;
        content: string;
        vector: number[];
        sparseVector: SparseVector;
        metadata: Record<string, any>;
    }[]): Promise<void>;
    /**
     * Remove chunks by IDs from existing collection
     */
    removeChunks(chunkIds: string[]): Promise<void>;
    /**
     * Get collection statistics from existing Qdrant collection
     */
    getStats(): Promise<{
        totalChunks: number;
        brainwavSource: string;
        collectionInfo: any;
    }>;
    /**
     * Health check using existing collection
     */
    healthCheck(): Promise<boolean>;
    /**
     * Set up distributed cache integration
     */
    setDistributedCache(cache: import('../caching/DistributedCache.js').DistributedCache): Promise<void>;
    /**
     * Close the connection (following memory-core patterns)
     */
    close(): Promise<void>;
    /**
     * Generate cache key for query parameters
     */
    private _generateCacheKey;
    /**
     * Build filter for Qdrant search
     */
    private _buildFilter;
}
/**
 * Factory function to create Qdrant hybrid search instance
 * Using existing brAInwav memory stack configuration
 */
export declare function createQdrantHybridSearch(config?: Partial<QdrantConfig>): QdrantHybridSearch;
/**
 * Default configuration for brAInwav Cortex-OS existing Qdrant stack
 */
export declare const defaultQdrantConfig: QdrantConfig;
