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
import { QdrantClient } from '@qdrant/js-client-rest';
import { z } from 'zod';
// Configuration schemas aligned with existing brAInwav memory stack
export const QdrantConfigSchema = z.object({
    url: z.string().default(process.env.QDRANT_URL || 'qdrant:6333'), // Matches existing Docker setup
    apiKey: z.string().optional(),
    collection: z.string().default('local_memory_v1'), // Existing collection name
    timeout: z.number().default(30000),
    maxRetries: z.number().default(3),
    brainwavBranding: z.boolean().default(true),
});
export const GraphRAGQueryParamsSchema = z.object({
    question: z.string().min(1),
    k: z.number().int().min(1).max(50).default(8),
    threshold: z.number().min(0).max(1).optional(),
    includeVectors: z.boolean().default(false),
    namespace: z.string().optional(),
    filters: z.record(z.any()).optional(),
});
/**
 * Qdrant Hybrid Search implementation for brAInwav GraphRAG
 * Integrates with existing Qdrant infrastructure from memory-core
 */
export class QdrantHybridSearch {
    client = null;
    config;
    embedDense = null;
    embedSparse = null;
    localCache = new Map();
    LOCAL_CACHE_TTL = 60000; // 1 minute for local cache
    MAX_LOCAL_CACHE_SIZE = 100;
    distributedCache = null;
    constructor(config) {
        this.config = QdrantConfigSchema.parse(config);
    }
    /**
     * Initialize Qdrant connection using existing brAInwav patterns
     */
    async initialize(embedDenseFunc, embedSparseFunc) {
        try {
            // Initialize QdrantClient following existing memory-core patterns
            this.client = new QdrantClient({
                url: this.config.url,
                apiKey: this.config.apiKey,
            });
            this.embedDense = embedDenseFunc;
            this.embedSparse = embedSparseFunc;
            // Verify connection to existing collection
            await this.client.getCollection(this.config.collection);
            console.log(`brAInwav Qdrant GraphRAG initialized: ${this.config.collection} at ${this.config.url}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`brAInwav Qdrant GraphRAG initialization failed: ${errorMessage}`);
        }
    }
    /**
     * Perform hybrid search using Qdrant's multi-vector capabilities with multi-level caching
     */
    async hybridSearch(params) {
        if (!this.client || !this.embedDense || !this.embedSparse) {
            throw new Error('brAInwav Qdrant GraphRAG not initialized');
        }
        const startTime = Date.now();
        const cacheKey = this._generateCacheKey(params);
        try {
            // Check local cache first (fastest)
            const localCached = this.localCache.get(cacheKey);
            if (localCached && Date.now() - localCached.timestamp < this.LOCAL_CACHE_TTL) {
                console.log('brAInwav GraphRAG local cache hit', {
                    component: 'memory-core',
                    brand: 'brAInwav',
                    cacheKey: `${cacheKey.substring(0, 20)}...`,
                    age: Date.now() - localCached.timestamp,
                });
                return localCached.results;
            }
            // Check distributed cache
            if (this.distributedCache) {
                const distributedCached = await this.distributedCache.get(cacheKey, 'qdrant');
                if (distributedCached) {
                    console.log('brAInwav GraphRAG distributed cache hit', {
                        component: 'memory-core',
                        brand: 'brAInwav',
                        cacheKey: `${cacheKey.substring(0, 20)}...`,
                    });
                    // Store in local cache for faster access
                    if (this.localCache.size < this.MAX_LOCAL_CACHE_SIZE) {
                        this.localCache.set(cacheKey, {
                            results: distributedCached,
                            timestamp: Date.now(),
                        });
                    }
                    return distributedCached;
                }
            }
            // Cache miss - perform search
            console.log('brAInwav GraphRAG cache miss - performing search', {
                component: 'memory-core',
                brand: 'brAInwav',
                cacheKey: `${cacheKey.substring(0, 20)}...`,
            });
            // Parallelize embedding generation
            const [denseVector, sparseVector] = await Promise.all([
                this.embedDense(params.question),
                this.embedSparse(params.question),
            ]);
            // Optimized query request with batch operations
            const queryRequest = {
                query: {
                    must: [
                        {
                            vector: {
                                name: 'dense',
                                vector: denseVector,
                                limit: params.k,
                            },
                        },
                        // Only add sparse vector if it has meaningful content
                        ...(sparseVector.indices.length > 0
                            ? [
                                {
                                    sparse_vector: {
                                        name: 'sparse',
                                        indices: sparseVector.indices,
                                        values: sparseVector.values,
                                        limit: params.k,
                                    },
                                },
                            ]
                            : []),
                    ],
                },
                with_payload: {
                    include: [
                        'node_id',
                        'chunk_content',
                        'path',
                        'node_type',
                        'node_key',
                        'line_start',
                        'line_end',
                        'brainwav_source',
                    ],
                },
                with_vector: params.includeVectors,
                limit: params.k,
                score_threshold: params.threshold,
                filter: this._buildFilter(params.filters, params.namespace),
            };
            const response = (await Promise.race([
                this.client.query(this.config.collection, queryRequest),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), this.config.timeout)),
            ]));
            const points = response.points ?? [];
            // Batch transform results for better performance
            const transformedResults = points.map((point) => ({
                id: String(point.id),
                score: point.score ?? 0,
                nodeId: point.payload?.node_id || '',
                chunkContent: point.payload?.chunk_content || '',
                metadata: {
                    path: point.payload?.path || '',
                    nodeType: point.payload?.node_type || '',
                    nodeKey: point.payload?.node_key || '',
                    lineStart: point.payload?.line_start,
                    lineEnd: point.payload?.line_end,
                    brainwavSource: this.config.brainwavBranding
                        ? 'brAInwav Cortex-OS GraphRAG'
                        : point.payload?.brainwav_source || 'Unknown',
                    relevanceScore: point.score ?? 0,
                    retrievalDurationMs: Date.now() - startTime,
                    ...point.payload,
                },
                vector: params.includeVectors ? point.vector : undefined,
            }));
            // Cache results
            await this.cacheResults(cacheKey, transformedResults);
            console.log('brAInwav GraphRAG Qdrant search completed', {
                component: 'memory-core',
                brand: 'brAInwav',
                resultCount: transformedResults.length,
                durationMs: Date.now() - startTime,
                localCacheSize: this.localCache.size,
            });
            return transformedResults;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('brAInwav GraphRAG Qdrant search failed', {
                component: 'memory-core',
                brand: 'brAInwav',
                error: errorMessage,
                durationMs: Date.now() - startTime,
            });
            throw new Error(`brAInwav GraphRAG Qdrant search failed: ${errorMessage}`);
        }
    }
    async cacheResults(cacheKey, results) {
        // Store in local cache
        if (this.localCache.size < this.MAX_LOCAL_CACHE_SIZE) {
            this.localCache.set(cacheKey, {
                results,
                timestamp: Date.now(),
            });
        }
        else {
            // Evict oldest local entry
            const oldestKey = this.localCache.keys().next().value;
            this.localCache.delete(oldestKey);
            this.localCache.set(cacheKey, {
                results,
                timestamp: Date.now(),
            });
        }
        // Store in distributed cache
        if (this.distributedCache) {
            try {
                await this.distributedCache.set(cacheKey, results, {
                    namespace: 'qdrant',
                    ttl: 300000, // 5 minutes
                });
            }
            catch (error) {
                console.warn('brAInwav GraphRAG distributed cache set failed', {
                    component: 'memory-core',
                    brand: 'brAInwav',
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }
    /**
     * Add chunks to the existing Qdrant collection
     */
    async addChunks(chunks) {
        if (!this.client)
            throw new Error('Qdrant client not initialized');
        const points = chunks.map((chunk) => ({
            id: chunk.id,
            vector: chunk.vector,
            sparse_vector: {
                indices: chunk.sparseVector.indices,
                values: chunk.sparseVector.values,
            },
            payload: {
                node_id: chunk.nodeId,
                chunk_content: chunk.content,
                path: chunk.metadata.path,
                node_type: chunk.metadata.nodeType,
                node_key: chunk.metadata.nodeKey,
                line_start: chunk.metadata.lineStart,
                line_end: chunk.metadata.lineEnd,
                brainwav_source: this.config.brainwavBranding
                    ? 'brAInwav Cortex-OS GraphRAG'
                    : chunk.metadata.brainwav_source || 'Unknown',
                ...chunk.metadata,
            },
        }));
        await this.client.upsert(this.config.collection, {
            points,
            wait: true,
        });
        console.log(`brAInwav GraphRAG: Added ${chunks.length} chunks to Qdrant collection ${this.config.collection}`);
    }
    /**
     * Remove chunks by IDs from existing collection
     */
    async removeChunks(chunkIds) {
        if (!this.client)
            throw new Error('Qdrant client not initialized');
        await this.client.delete(this.config.collection, {
            points: chunkIds,
            wait: true,
        });
        console.log(`brAInwav GraphRAG: Removed ${chunkIds.length} chunks from Qdrant collection ${this.config.collection}`);
    }
    /**
     * Get collection statistics from existing Qdrant collection
     */
    async getStats() {
        if (!this.client)
            throw new Error('Qdrant client not initialized');
        const info = await this.client.getCollection(this.config.collection);
        return {
            totalChunks: info.points_count || 0,
            brainwavSource: 'brAInwav Cortex-OS GraphRAG',
            collectionInfo: info,
        };
    }
    /**
     * Health check using existing collection
     */
    async healthCheck() {
        try {
            if (!this.client)
                return false;
            await this.client.getCollection(this.config.collection);
            return true;
        }
        catch (error) {
            console.error('brAInwav Qdrant GraphRAG health check failed:', error);
            return false;
        }
    }
    /**
     * Set up distributed cache integration
     */
    async setDistributedCache(cache) {
        this.distributedCache = cache;
        console.info('brAInwav Qdrant GraphRAG distributed cache configured', {
            component: 'memory-core',
            brand: 'brAInwav',
        });
    }
    /**
     * Close the connection (following memory-core patterns)
     */
    async close() {
        // Clean up local cache
        this.localCache.clear();
        // QdrantClient doesn't require explicit closing, but we clean up references
        this.client = null;
        this.embedDense = null;
        this.embedSparse = null;
        this.distributedCache = null;
        console.log('brAInwav Qdrant GraphRAG client closed', {
            component: 'memory-core',
            brand: 'brAInwav',
            localCacheSize: 0,
        });
    }
    /**
     * Generate cache key for query parameters
     */
    _generateCacheKey(params) {
        const keyParts = [
            params.question,
            params.k.toString(),
            params.threshold?.toString() || 'none',
            params.namespace || 'none',
            JSON.stringify(params.filters || {}),
        ];
        return Buffer.from(keyParts.join('|')).toString('base64');
    }
    /**
     * Build filter for Qdrant search
     */
    _buildFilter(filters, namespace) {
        const conditions = [];
        // Add namespace filter if provided
        if (namespace) {
            conditions.push({
                key: 'namespace',
                match: { value: namespace },
            });
        }
        // Add custom filters
        if (filters) {
            for (const [key, value] of Object.entries(filters)) {
                conditions.push({
                    key,
                    match: { value },
                });
            }
        }
        return conditions.length > 0 ? { must: conditions } : undefined;
    }
}
/**
 * Factory function to create Qdrant hybrid search instance
 * Using existing brAInwav memory stack configuration
 */
export function createQdrantHybridSearch(config) {
    const defaultConfig = {
        url: process.env.QDRANT_URL || 'qdrant:6333',
        apiKey: process.env.QDRANT_API_KEY,
        collection: process.env.QDRANT_COLLECTION || 'local_memory_v1',
        timeout: 30000,
        maxRetries: 3,
        brainwavBranding: true,
    };
    const mergedConfig = { ...defaultConfig, ...config };
    return new QdrantHybridSearch(mergedConfig);
}
/**
 * Default configuration for brAInwav Cortex-OS existing Qdrant stack
 */
export const defaultQdrantConfig = {
    url: 'qdrant:6333', // Existing Docker service
    collection: 'local_memory_v1', // Existing collection
    timeout: 30000,
    maxRetries: 3,
    brainwavBranding: true,
};
