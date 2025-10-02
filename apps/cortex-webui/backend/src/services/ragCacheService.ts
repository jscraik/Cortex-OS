// RAG Query Cache Service for brAInwav Cortex WebUI
// Intelligent caching for Retrieval-Augmented Generation queries

import crypto from 'node:crypto';
import { z } from 'zod';
import { cacheService } from './cacheService.js';

export interface RAGQuery {
	userId: string;
	query: string;
	filters?: Record<string, unknown>;
	limit?: number;
	offset?: number;
	scoreThreshold?: number;
	includeMetadata?: boolean;
	embeddingModel?: string;
	searchMethod?: 'vector' | 'hybrid' | 'keyword';
}

export interface RAGResult {
	documents: Array<{
		id: string;
		content: string;
		metadata: Record<string, unknown>;
		score: number;
		chunkIndex: number;
		pageRange?: { start: number; end: number };
	}>;
	totalCount: number;
	searchTime: number;
	embeddingTime?: number;
	cacheHit: boolean;
	timestamp: string;
}

export interface RAGDocumentInput {
	id: string;
	content: string;
	metadata?: Record<string, unknown>;
	score?: number;
	chunkIndex?: number;
	pageRange?: { start: number; end: number };
}

export interface RAGCacheStats {
	totalQueries: number;
	cacheHits: number;
	cacheMisses: number;
	hitRate: number;
	averageResponseTime: number;
	averageCacheResponseTime: number;
	cacheSize: number;
	memoryUsage: number;
}

export interface CacheConfig {
	ttl: number;
	compress: boolean;
	similarityThreshold: number;
	maxCacheSize: number;
	preWarmPatterns: string[];
}

// Schema for RAG query validation
const ragQuerySchema = z.object({
	userId: z.string(),
	query: z.string().min(1),
	filters: z.record(z.any()).optional(),
	limit: z.number().min(1).max(1000).default(10),
	offset: z.number().min(0).default(0),
	scoreThreshold: z.number().min(0).max(1).optional(),
	includeMetadata: z.boolean().default(true),
	embeddingModel: z.string().optional(),
	searchMethod: z.enum(['vector', 'hybrid', 'keyword']).default('hybrid'),
});

// Schema for RAG result validation
const ragResultSchema = z.object({
	documents: z.array(
		z.object({
			id: z.string(),
			content: z.string(),
			metadata: z.record(z.any()),
			score: z.number().min(0).max(1),
			chunkIndex: z.number(),
			pageRange: z
				.object({
					start: z.number(),
					end: z.number(),
				})
				.optional(),
		}),
	),
	totalCount: z.number().min(0),
	searchTime: z.number().min(0),
	embeddingTime: z.number().min(0).optional(),
	cacheHit: z.boolean(),
	timestamp: z.string(),
});

export class RAGCacheService {
	private static instance: RAGCacheService;
	private config: CacheConfig;
	private stats: RAGCacheStats = {
		totalQueries: 0,
		cacheHits: 0,
		cacheMisses: 0,
		hitRate: 0,
		averageResponseTime: 0,
		averageCacheResponseTime: 0,
		cacheSize: 0,
		memoryUsage: 0,
	};
	private queryCache: Map<string, RAGResult> = new Map();
	private semanticallySimilarCache: Map<string, string[]> = new Map();

	private constructor(config: Partial<CacheConfig> = {}) {
		this.config = {
			ttl: config.ttl || 1800, // 30 minutes
			compress: config.compress !== false,
			similarityThreshold: config.similarityThreshold || 0.85,
			maxCacheSize: config.maxCacheSize || 1000,
			preWarmPatterns: config.preWarmPatterns || [],
		};

		// Start cache maintenance interval
		this.startMaintenanceInterval();
	}

	public static getInstance(config?: Partial<CacheConfig>): RAGCacheService {
		if (!RAGCacheService.instance) {
			RAGCacheService.instance = new RAGCacheService(config);
		}
		return RAGCacheService.instance;
	}

	private generateQueryKey(query: RAGQuery): string {
		const normalizedQuery = query.query.toLowerCase().trim();
		const queryHash = crypto.createHash('sha256').update(normalizedQuery).digest('hex');

		const filtersKey = query.filters ? JSON.stringify(query.filters) : 'none';
		const filtersHash = crypto.createHash('sha256').update(filtersKey).digest('hex');

		const params = {
			userId: query.userId,
			limit: query.limit,
			offset: query.offset,
			scoreThreshold: query.scoreThreshold,
			searchMethod: query.searchMethod,
			embeddingModel: query.embeddingModel,
		};

		const paramsKey = JSON.stringify(params);
		const paramsHash = crypto.createHash('sha256').update(paramsKey).digest('hex');

		return `rag:${queryHash}:${filtersHash}:${paramsHash}`;
	}

	private generateSemanticKey(query: string): string {
		const normalizedQuery = query.toLowerCase().trim();
		const words = normalizedQuery.split(/\s+/).filter((word) => word.length > 2);
		return `semantic:${words.slice(0, 10).sort().join('_')}`;
	}

	private calculateQuerySimilarity(query1: string, query2: string): number {
		// Simple similarity calculation based on word overlap
		const words1 = new Set(query1.toLowerCase().split(/\s+/));
		const words2 = new Set(query2.toLowerCase().split(/\s+/));

		const intersection = new Set([...words1].filter((word) => words2.has(word)));
		const union = new Set([...words1, ...words2]);

		return intersection.size / union.size; // Jaccard similarity
	}

	private async findSimilarCachedQuery(query: string, _userId: string): Promise<string | null> {
		const semanticKey = this.generateSemanticKey(query);
		const similarKeys = this.semanticallySimilarCache.get(semanticKey) || [];

		for (const cacheKey of similarKeys) {
			try {
				const cachedResult = await cacheService.get<RAGResult>(cacheKey, undefined, {
					namespace: 'rag-cache',
					compress: this.config.compress,
				});

				if (cachedResult) {
					// Extract original query from cache key
					const originalQuery = cacheKey.split(':')[1];
					const similarity = this.calculateQuerySimilarity(query, originalQuery);

					if (similarity >= this.config.similarityThreshold) {
						return cacheKey;
					}
				}
			} catch (error) {
				console.error('Error checking similar query:', error);
			}
		}

		return null;
	}

	public async get(query: RAGQuery): Promise<RAGResult | null> {
		try {
			// Validate input
			const validatedQuery = ragQuerySchema.parse(query);
			this.stats.totalQueries++;

			// First try exact match
			const cacheKey = this.generateQueryKey(validatedQuery);
			const exactMatch = await cacheService.get<RAGResult>(cacheKey, ragResultSchema, {
				namespace: 'rag-cache',
				compress: this.config.compress,
			});

			if (exactMatch) {
				this.stats.cacheHits++;
				exactMatch.cacheHit = true;
				return exactMatch;
			}

			// Try semantic similarity
			const similarKey = await this.findSimilarCachedQuery(
				validatedQuery.query,
				validatedQuery.userId,
			);
			if (similarKey) {
				const similarResult = await cacheService.get<RAGResult>(similarKey, ragResultSchema, {
					namespace: 'rag-cache',
					compress: this.config.compress,
				});

				if (similarResult) {
					this.stats.cacheHits++;
					similarResult.cacheHit = true;
					return similarResult;
				}
			}

			this.stats.cacheMisses++;
			return null;
		} catch (error) {
			console.error('RAG cache get error:', error);
			this.stats.cacheMisses++;
			return null;
		}
	}

	public async set(query: RAGQuery, result: RAGResult): Promise<void> {
		try {
			const validatedQuery = ragQuerySchema.parse(query);
			const validatedResult = ragResultSchema.parse(result);

			const cacheKey = this.generateQueryKey(validatedQuery);

			// Store in Redis cache
			await cacheService.set(cacheKey, validatedResult, {
				ttl: this.config.ttl,
				namespace: 'rag-cache',
				compress: this.config.compress,
			});

			// Update semantic index
			const semanticKey = this.generateSemanticKey(validatedQuery.query);
			const similarKeys = this.semanticallySimilarCache.get(semanticKey) || [];
			similarKeys.push(cacheKey);

			// Limit size of semantic groups
			if (similarKeys.length > 50) {
				similarKeys.shift();
			}

			this.semanticallySimilarCache.set(semanticKey, similarKeys);

			// Update local cache for quick access
			this.queryCache.set(cacheKey, validatedResult);

			// Cleanup if cache is too large
			if (this.queryCache.size > this.config.maxCacheSize) {
				this.cleanupCache();
			}

			// Update stats
			this.stats.cacheSize = this.queryCache.size;
		} catch (error) {
			console.error('RAG cache set error:', error);
		}
	}

	public async invalidate(userId: string, documentId?: string): Promise<void> {
		try {
			// Invalidate all user's cached queries
			await cacheService.invalidatePattern(`rag:*:${userId}:*`, 'rag-cache');

			// Invalidate queries related to specific document
			if (documentId) {
				await cacheService.invalidatePattern(`rag:*:*:*:${documentId}:*`, 'rag-cache');
			}

			// Clear local cache
			for (const [key, value] of this.queryCache) {
				if (key.includes(userId) || (documentId && JSON.stringify(value).includes(documentId))) {
					this.queryCache.delete(key);
				}
			}

			// Clear semantic cache
			this.semanticallySimilarCache.clear();

			this.stats.cacheSize = this.queryCache.size;
		} catch (error) {
			console.error('RAG cache invalidation error:', error);
		}
	}

	public async getOrExecute(
		query: RAGQuery,
		ragFunction: (query: RAGQuery) => Promise<RAGResult>,
	): Promise<RAGResult> {
		// Try to get from cache first
		const cached = await this.get(query);
		if (cached) {
			return cached;
		}

		// Execute RAG function
		const startTime = Date.now();
		const result = await ragFunction(query);
		result.searchTime = Date.now() - startTime;
		result.cacheHit = false;
		result.timestamp = new Date().toISOString();

		// Cache the result
		await this.set(query, result);

		return result;
	}

	private cleanupCache(): void {
		// Simple LRU cleanup - remove oldest entries
		const entries = Array.from(this.queryCache.entries());
		const entriesToRemove = entries.slice(0, Math.floor(entries.length * 0.2));

		for (const [key] of entriesToRemove) {
			this.queryCache.delete(key);
		}
	}

	private startMaintenanceInterval(): void {
		// Run maintenance every 5 minutes
		setInterval(() => {
			this.updateStats();
			this.maintenanceCleanup();
		}, 300000);
	}

	private async updateStats(): Promise<void> {
		try {
			const total = this.stats.cacheHits + this.stats.cacheMisses;
			this.stats.hitRate = total > 0 ? this.stats.cacheHits / total : 0;

			// Get Redis info for memory usage
			const redisInfo = await cacheService.getRedisInfo();
			if (redisInfo.used_memory) {
				this.stats.memoryUsage = parseInt(redisInfo.used_memory, 10);
			}
		} catch (error) {
			console.error('Error updating RAG cache stats:', error);
		}
	}

	private maintenanceCleanup(): void {
		// Clean up expired entries from semantic cache
		for (const [semanticKey, cacheKeys] of this.semanticallySimilarCache.entries()) {
			const validKeys: string[] = [];

			for (const cacheKey of cacheKeys) {
				if (this.queryCache.has(cacheKey)) {
					validKeys.push(cacheKey);
				}
			}

			if (validKeys.length === 0) {
				this.semanticallySimilarCache.delete(semanticKey);
			} else if (validKeys.length !== cacheKeys.length) {
				this.semanticallySimilarCache.set(semanticKey, validKeys);
			}
		}
	}

	public getStats(): RAGCacheStats {
		const total = this.stats.cacheHits + this.stats.cacheMisses;
		this.stats.hitRate = total > 0 ? this.stats.cacheHits / total : 0;
		return { ...this.stats };
	}

	public resetStats(): void {
		this.stats = {
			totalQueries: 0,
			cacheHits: 0,
			cacheMisses: 0,
			hitRate: 0,
			averageResponseTime: 0,
			averageCacheResponseTime: 0,
			cacheSize: this.queryCache.size,
			memoryUsage: this.stats.memoryUsage,
		};
	}

	public async preWarmCommonQueries(commonQueries: RAGQuery[]): Promise<void> {
		console.log(`Pre-warming cache with ${commonQueries.length} common queries...`);

		for (const query of commonQueries) {
			try {
				// Generate cache key to warm up the cache structure
				const _cacheKey = this.generateQueryKey(query);
				const semanticKey = this.generateSemanticKey(query.query);

				// Initialize semantic cache structure
				if (!this.semanticallySimilarCache.has(semanticKey)) {
					this.semanticallySimilarCache.set(semanticKey, []);
				}

				console.log(`Pre-warmed cache for query: "${query.query}"`);
			} catch (error) {
				console.error('Error pre-warming query cache:', error);
			}
		}
	}

	public getCacheAnalysis(): {
		popularQueries: Array<{ query: string; hits: number }>;
		cacheEfficiency: number;
		memoryEfficiency: number;
		recommendations: string[];
	} {
		const recommendations: string[] = [];

		// Analyze cache efficiency
		if (this.stats.hitRate < 0.3) {
			recommendations.push('Consider increasing cache TTL or adjusting similarity threshold');
		}

		if (this.stats.cacheSize > this.config.maxCacheSize * 0.8) {
			recommendations.push('Cache size is approaching limit, consider increasing maxCacheSize');
		}

		if (this.stats.memoryUsage > 100 * 1024 * 1024) {
			// 100MB
			recommendations.push('High memory usage detected, consider compression adjustments');
		}

		return {
			popularQueries: [], // Would need to track query popularity
			cacheEfficiency: this.stats.hitRate,
			memoryEfficiency: this.stats.cacheSize / this.config.maxCacheSize,
			recommendations,
		};
	}
}

// Export singleton instance
export const ragCacheService = RAGCacheService.getInstance();

// Export utility functions
export const createRAGQuery = (
	params: Partial<RAGQuery> & { userId: string; query: string },
): RAGQuery => ({
	userId: params.userId,
	query: params.query,
	filters: params.filters,
	limit: params.limit ?? 10,
	offset: params.offset ?? 0,
	scoreThreshold: params.scoreThreshold,
	includeMetadata: params.includeMetadata ?? true,
	embeddingModel: params.embeddingModel,
	searchMethod: params.searchMethod ?? 'hybrid',
});

export const createRAGResult = (
	documents: RAGDocumentInput[],
	totalCount: number,
	searchTime: number,
): RAGResult => ({
	documents: documents.map((doc) => ({
		id: doc.id,
		content: doc.content,
		metadata: doc.metadata || {},
		score: doc.score || 0,
		chunkIndex: doc.chunkIndex || 0,
		pageRange: doc.pageRange,
	})),
	totalCount,
	searchTime,
	embeddingTime: 0,
	cacheHit: false,
	timestamp: new Date().toISOString(),
});

// Export types
export type { CacheConfig, RAGCacheStats, RAGQuery, RAGResult };
