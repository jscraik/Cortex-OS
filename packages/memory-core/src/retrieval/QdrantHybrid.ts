// @ts-nocheck
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

// Qdrant types and interfaces
export interface SparseVector {
	indices: number[];
	values: number[];
}

// Configuration schemas aligned with existing brAInwav memory stack
export const QdrantConfigSchema = z.object({
	url: z.string().default(process.env.QDRANT_URL || 'qdrant:6333'), // Matches existing Docker setup
	apiKey: z.string().optional(),
	collection: z.string().default('local_memory_v1'), // Existing collection name
	timeout: z.number().default(30000),
	maxRetries: z.number().default(3),
	brainwavBranding: z.boolean().default(true),
});

export type QdrantConfig = z.infer<typeof QdrantConfigSchema>;

export const GraphRAGQueryParamsSchema = z.object({
	question: z.string().min(1),
	k: z.number().int().min(1).max(50).default(8),
	threshold: z.number().min(0).max(1).optional(),
	includeVectors: z.boolean().default(false),
	namespace: z.string().optional(),
	filters: z.record(z.any()).optional(),
});

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
export class QdrantHybridSearch {
	private client: QdrantClient | null = null;
	private config: QdrantConfig;
	private embedDense: ((text: string) => Promise<number[]>) | null = null;
	private embedSparse: ((text: string) => Promise<SparseVector>) | null = null;
	private localCache = new Map<string, { results: GraphRAGSearchResult[]; timestamp: number }>();
	private readonly LOCAL_CACHE_TTL = 60000; // 1 minute for local cache
	private readonly MAX_LOCAL_CACHE_SIZE = 100;
	private distributedCache: import('../caching/DistributedCache.js').DistributedCache | null = null;

	constructor(config: QdrantConfig) {
		this.config = QdrantConfigSchema.parse(config);
	}

	/**
	 * Initialize Qdrant connection using existing brAInwav patterns
	 */
	async initialize(
		embedDenseFunc: (text: string) => Promise<number[]>,
		embedSparseFunc: (text: string) => Promise<SparseVector>,
	): Promise<void> {
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

			console.log(
				`brAInwav Qdrant GraphRAG initialized: ${this.config.collection} at ${this.config.url}`,
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`brAInwav Qdrant GraphRAG initialization failed: ${errorMessage}`);
		}
	}

	/**
	 * Perform hybrid search using Qdrant's multi-vector capabilities with multi-level caching
	 */
	async hybridSearch(params: GraphRAGQueryParams): Promise<GraphRAGSearchResult[]> {
		if (!this.client || !this.embedDense || !this.embedSparse) {
			throw new Error('brAInwav Qdrant GraphRAG not initialized');
		}

		const startTime = Date.now();
		const cacheKey = this._generateCacheKey(params);

		try {
			// Check local cache first (fastest)
			const localCached = this.localCache.get(cacheKey);
			if (localCached && (Date.now() - localCached.timestamp) < this.LOCAL_CACHE_TTL) {
				console.log('brAInwav GraphRAG local cache hit', {
					component: 'memory-core',
					brand: 'brAInwav',
					cacheKey: cacheKey.substring(0, 20) + '...',
					age: Date.now() - localCached.timestamp,
				});
				return localCached.results;
			}

			// Check distributed cache
			if (this.distributedCache) {
				const distributedCached = await this.distributedCache.get<GraphRAGSearchResult[]>(cacheKey, 'qdrant');
				if (distributedCached) {
					console.log('brAInwav GraphRAG distributed cache hit', {
						component: 'memory-core',
						brand: 'brAInwav',
						cacheKey: cacheKey.substring(0, 20) + '...',
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
				cacheKey: cacheKey.substring(0, 20) + '...',
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
						...(sparseVector.indices.length > 0 ? [{
							sparse_vector: {
								name: 'sparse',
								indices: sparseVector.indices,
								values: sparseVector.values,
								limit: params.k,
							},
						}] : []),
					],
				},
				with_payload: {
					include: ['node_id', 'chunk_content', 'path', 'node_type', 'node_key', 'line_start', 'line_end', 'brainwav_source'],
				},
				with_vector: params.includeVectors,
				limit: params.k,
				score_threshold: params.threshold,
				filter: this._buildFilter(params.filters, params.namespace),
			};

			const response = await Promise.race([
				this.client.query(this.config.collection, queryRequest),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Query timeout')), this.config.timeout)
				),
			]) as any;

			const points = response.points ?? [];

			// Batch transform results for better performance
			const transformedResults: GraphRAGSearchResult[] = points.map((point) => ({
				id: String(point.id),
				score: point.score ?? 0,
				nodeId: (point.payload?.node_id as string) || '',
				chunkContent: (point.payload?.chunk_content as string) || '',
				metadata: {
					path: (point.payload?.path as string) || '',
					nodeType: (point.payload?.node_type as string) || '',
					nodeKey: (point.payload?.node_key as string) || '',
					lineStart: point.payload?.line_start as number,
					lineEnd: point.payload?.line_end as number,
					brainwavSource: this.config.brainwavBranding
						? 'brAInwav Cortex-OS GraphRAG'
						: (point.payload?.brainwav_source as string) || 'Unknown',
					relevanceScore: point.score ?? 0,
					retrievalDurationMs: Date.now() - startTime,
					...point.payload,
				},
				vector: params.includeVectors ? (point.vector as number[]) : undefined,
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
		} catch (error) {
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

	private async cacheResults(cacheKey: string, results: GraphRAGSearchResult[]): Promise<void> {
		// Store in local cache
		if (this.localCache.size < this.MAX_LOCAL_CACHE_SIZE) {
			this.localCache.set(cacheKey, {
				results,
				timestamp: Date.now(),
			});
		} else {
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
			} catch (error) {
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
	async addChunks(
		chunks: {
			id: string;
			nodeId: string;
			content: string;
			vector: number[];
			sparseVector: SparseVector;
			metadata: Record<string, any>;
		}[],
	): Promise<void> {
		if (!this.client) throw new Error('Qdrant client not initialized');

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

		console.log(
			`brAInwav GraphRAG: Added ${chunks.length} chunks to Qdrant collection ${this.config.collection}`,
		);
	}

	/**
	 * Remove chunks by IDs from existing collection
	 */
	async removeChunks(chunkIds: string[]): Promise<void> {
		if (!this.client) throw new Error('Qdrant client not initialized');

		await this.client.delete(this.config.collection, {
			points: chunkIds,
			wait: true,
		});

		console.log(
			`brAInwav GraphRAG: Removed ${chunkIds.length} chunks from Qdrant collection ${this.config.collection}`,
		);
	}

	/**
	 * Get collection statistics from existing Qdrant collection
	 */
	async getStats(): Promise<{
		totalChunks: number;
		brainwavSource: string;
		collectionInfo: any;
	}> {
		if (!this.client) throw new Error('Qdrant client not initialized');

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
	async healthCheck(): Promise<boolean> {
		try {
			if (!this.client) return false;
			await this.client.getCollection(this.config.collection);
			return true;
		} catch (error) {
			console.error('brAInwav Qdrant GraphRAG health check failed:', error);
			return false;
		}
	}

	/**
	 * Set up distributed cache integration
	 */
	async setDistributedCache(cache: import('../caching/DistributedCache.js').DistributedCache): Promise<void> {
		this.distributedCache = cache;
		console.info('brAInwav Qdrant GraphRAG distributed cache configured', {
			component: 'memory-core',
			brand: 'brAInwav',
		});
	}

	/**
	 * Close the connection (following memory-core patterns)
	 */
	async close(): Promise<void> {
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
	private _generateCacheKey(params: GraphRAGQueryParams): string {
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
	 * Clean up expired cache entries
	 */
	private _cleanupCache(): void {
		const now = Date.now();
		for (const [key, value] of this.queryCache.entries()) {
			if (now - value.timestamp > this.CACHE_TTL) {
				this.queryCache.delete(key);
			}
		}
	}

	/**
	 * Build filter for Qdrant search
	 */
	private _buildFilter(filters?: Record<string, any>, namespace?: string): any {
		const conditions: any[] = [];

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
export function createQdrantHybridSearch(config?: Partial<QdrantConfig>): QdrantHybridSearch {
	const defaultConfig: QdrantConfig = {
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
export const defaultQdrantConfig: QdrantConfig = {
	url: 'qdrant:6333', // Existing Docker service
	collection: 'local_memory_v1', // Existing collection
	timeout: 30000,
	maxRetries: 3,
	brainwavBranding: true,
};
