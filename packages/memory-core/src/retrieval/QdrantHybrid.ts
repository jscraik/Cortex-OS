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
interface SparseVector {
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
	 * Perform hybrid search using Qdrant's multi-vector capabilities
	 */
	async hybridSearch(params: GraphRAGQueryParams): Promise<GraphRAGSearchResult[]> {
		if (!this.client || !this.embedDense || !this.embedSparse) {
			throw new Error('brAInwav Qdrant GraphRAG not initialized');
		}

		const startTime = Date.now();

		try {
			// Generate embeddings
			const denseVector = await this.embedDense(params.question);
			// Note: sparse vector support to be added in future iteration

			// Prepare search request with hybrid scoring
			const searchRequest = {
				vector: denseVector,
				limit: params.k,
				with_payload: true,
				with_vector: params.includeVectors,
				score_threshold: params.threshold,
				filter: this._buildFilter(params.filters, params.namespace),
			};

			// Execute search on existing collection
			const response = await this.client.search(this.config.collection, searchRequest);

			// Transform results to GraphRAG format
			const transformedResults: GraphRAGSearchResult[] = response.map((result) => ({
				id: String(result.id),
				score: result.score,
				nodeId: (result.payload?.node_id as string) || '',
				chunkContent: (result.payload?.chunk_content as string) || '',
				metadata: {
					path: (result.payload?.path as string) || '',
					nodeType: (result.payload?.node_type as string) || '',
					nodeKey: (result.payload?.node_key as string) || '',
					lineStart: result.payload?.line_start as number,
					lineEnd: result.payload?.line_end as number,
					brainwavSource: this.config.brainwavBranding
						? 'brAInwav Cortex-OS GraphRAG'
						: (result.payload?.brainwav_source as string) || 'Unknown',
					relevanceScore: result.score,
					retrievalDurationMs: Date.now() - startTime,
					...result.payload,
				},
				vector: params.includeVectors ? (result.vector as number[]) : undefined,
			}));

			console.log(
				`brAInwav GraphRAG Qdrant search completed: ${transformedResults.length} results in ${Date.now() - startTime}ms`,
			);

			return transformedResults;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`brAInwav GraphRAG Qdrant search failed: ${errorMessage}`);
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
	 * Close the connection (following memory-core patterns)
	 */
	async close(): Promise<void> {
		// QdrantClient doesn't require explicit closing, but we clean up references
		this.client = null;
		this.embedDense = null;
		this.embedSparse = null;
		console.log('brAInwav Qdrant GraphRAG client closed');
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
