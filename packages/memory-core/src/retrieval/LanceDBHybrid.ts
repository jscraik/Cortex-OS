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

// LanceDB types (would come from @vectordb/lancedb package)
interface LanceDBConnection {
	openTable(name: string): Promise<LanceDBTable>;
	createTable(name: string, data: any[], options?: any): Promise<LanceDBTable>;
	close(): Promise<void>;
}

interface LanceDBTable {
	search(vector: number[]): SearchBuilder;
	add(data: any[]): Promise<void>;
	countRows(): Promise<number>;
	delete(predicate: string): Promise<void>;
}

interface SearchBuilder {
	limit(k: number): SearchBuilder;
	hybridSearch(options: HybridSearchOptions): SearchBuilder;
	where(predicate: string): SearchBuilder;
	toArray(): Promise<SearchResult[]>;
}

interface HybridSearchOptions {
	queryType: 'hybrid';
	sparseVector: SparseVector;
	hybridMode: 'rrf' | 'linear';
	alpha: number; // dense weight (0.0 to 1.0)
}

interface SparseVector {
	indices: number[];
	values: number[];
}

interface SearchResult {
	lancedb_id: string;
	_distance: number;
	vector?: number[];
	sparse_vector?: SparseVector;
	node_id: string;
	chunk_content: string;
	metadata: {
		path: string;
		node_type: string;
		node_key: string;
		line_start?: number;
		line_end?: number;
		brainwav_source: string;
		[key: string]: any;
	};
}

// Configuration schemas
export const LanceDBConfigSchema = z.object({
	uri: z.string().describe('LanceDB connection URI'),
	tableName: z.string().default('cortex_graphrag'),
	dimensions: z.number().default(1024),
	hybridMode: z.enum(['rrf', 'linear']).default('rrf'),
	densityWeight: z.number().min(0).max(1).default(0.7),
	queryTimeout: z.number().default(30000),
	maxRetries: z.number().default(3),
	brainwavBranding: z.boolean().default(true),
});

export type LanceDBConfig = z.infer<typeof LanceDBConfigSchema>;

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
 * LanceDB Hybrid Search implementation for GraphRAG
 * Provides dense + sparse vector search with server-side fusion
 */
export class LanceDBHybridSearch {
	private db: LanceDBConnection | null = null;
	private table: LanceDBTable | null = null;
	private config: LanceDBConfig;
	private embedDense: ((text: string) => Promise<number[]>) | null = null;
	private embedSparse: ((text: string) => Promise<SparseVector>) | null = null;

	constructor(config: LanceDBConfig) {
		this.config = LanceDBConfigSchema.parse(config);
	}

	/**
	 * Initialize LanceDB connection and table
	 */
	async initialize(
		embedDenseFunc: (text: string) => Promise<number[]>,
		embedSparseFunc: (text: string) => Promise<SparseVector>,
	): Promise<void> {
		try {
			// Dynamic import to avoid build-time dependency
			// @ts-expect-error - LanceDB package may not be installed in all environments
			const lancedb = await import('vectordb');
			this.db = await lancedb.connect(this.config.uri);

			this.embedDense = embedDenseFunc;
			this.embedSparse = embedSparseFunc;

			try {
				if (this.db) {
					this.table = await this.db.openTable(this.config.tableName);
				}
			} catch {
				// Table doesn't exist, create it
				await this.createTable();
			}

			console.log(`brAInwav LanceDB hybrid search initialized: ${this.config.tableName}`);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`brAInwav LanceDB initialization failed: ${errorMessage}`);
		}
	}

	/**
	 * Create the GraphRAG table schema
	 */
	private async createTable(): Promise<void> {
		if (!this.db) throw new Error('LanceDB not initialized');

		const schema = [
			{
				lancedb_id: 'sample_id',
				vector: new Array(this.config.dimensions).fill(0),
				sparse_vector: { indices: [0], values: [0.0] },
				node_id: 'sample_node',
				chunk_content: 'sample content',
				metadata: {
					path: 'sample/path',
					node_type: 'PACKAGE',
					node_key: 'sample/key',
					line_start: 1,
					line_end: 10,
					brainwav_source: 'brAInwav Cortex-OS GraphRAG',
				},
			},
		];

		this.table = await this.db.createTable(this.config.tableName, schema, {
			mode: 'overwrite',
		});

		// Remove the sample row
		await this.table.delete('lancedb_id = "sample_id"');
	}

	/**
	 * Perform hybrid search with dense + sparse vectors
	 */
	async hybridSearch(params: GraphRAGQueryParams): Promise<GraphRAGSearchResult[]> {
		if (!this.table || !this.embedDense || !this.embedSparse) {
			throw new Error('brAInwav LanceDB hybrid search not initialized');
		}

		const startTime = Date.now();

		try {
			// Generate embeddings
			const [denseVector, sparseVector] = await Promise.all([
				this.embedDense(params.question),
				this.embedSparse(params.question),
			]);

			// Build search query
			let searchBuilder = this.table.search(denseVector).limit(params.k).hybridSearch({
				queryType: 'hybrid',
				sparseVector,
				hybridMode: this.config.hybridMode,
				alpha: this.config.densityWeight,
			});

			// Apply filters if provided
			if (params.filters) {
				const predicates = Object.entries(params.filters)
					.map(([key, value]) => `metadata.${key} = "${value}"`)
					.join(' AND ');
				searchBuilder = searchBuilder.where(predicates);
			}

			// Execute search
			const results = await searchBuilder.toArray();

			// Transform results
			const transformedResults: GraphRAGSearchResult[] = results
				.filter((r) => !params.threshold || r._distance >= params.threshold)
				.map((r) => ({
					id: r.lancedb_id,
					score: r._distance,
					nodeId: r.node_id,
					chunkContent: r.chunk_content,
					metadata: {
						path: r.metadata.path,
						nodeType: r.metadata.node_type,
						nodeKey: r.metadata.node_key,
						lineStart: r.metadata.line_start,
						lineEnd: r.metadata.line_end,
						brainwavSource: this.config.brainwavBranding
							? 'brAInwav Cortex-OS GraphRAG'
							: r.metadata.brainwav_source,
						relevanceScore: r._distance,
						retrievalDurationMs: Date.now() - startTime,
					},
					vector: params.includeVectors ? r.vector : undefined,
				}));

			console.log(
				`brAInwav GraphRAG hybrid search completed: ${transformedResults.length} results in ${Date.now() - startTime}ms`,
			);

			return transformedResults;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`brAInwav GraphRAG hybrid search failed: ${errorMessage}`);
		}
	}

	/**
	 * Add chunks to the LanceDB table
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
		if (!this.table) throw new Error('LanceDB table not initialized');

		const data = chunks.map((chunk) => ({
			lancedb_id: chunk.id,
			vector: chunk.vector,
			sparse_vector: chunk.sparseVector,
			node_id: chunk.nodeId,
			chunk_content: chunk.content,
			metadata: {
				...chunk.metadata,
				brainwav_source: this.config.brainwavBranding
					? 'brAInwav Cortex-OS GraphRAG'
					: chunk.metadata.brainwav_source || 'Unknown',
			},
		}));

		await this.table.add(data);
		console.log(`brAInwav GraphRAG: Added ${chunks.length} chunks to LanceDB`);
	}

	/**
	 * Remove chunks by IDs
	 */
	async removeChunks(chunkIds: string[]): Promise<void> {
		if (!this.table) throw new Error('LanceDB table not initialized');

		const predicate = chunkIds.map((id) => `lancedb_id = "${id}"`).join(' OR ');
		await this.table.delete(predicate);

		console.log(`brAInwav GraphRAG: Removed ${chunkIds.length} chunks from LanceDB`);
	}

	/**
	 * Get table statistics
	 */
	async getStats(): Promise<{
		totalChunks: number;
		brainwavSource: string;
	}> {
		if (!this.table) throw new Error('LanceDB table not initialized');

		const totalChunks = await this.table.countRows();

		return {
			totalChunks,
			brainwavSource: 'brAInwav Cortex-OS GraphRAG',
		};
	}

	/**
	 * Health check
	 */
	async healthCheck(): Promise<boolean> {
		try {
			if (!this.table) return false;
			await this.table.countRows();
			return true;
		} catch (error) {
			console.error('brAInwav LanceDB health check failed:', error);
			return false;
		}
	}

	/**
	 * Close the connection
	 */
	async close(): Promise<void> {
		if (this.db) {
			await this.db.close();
			this.db = null;
			this.table = null;
			console.log('brAInwav LanceDB connection closed');
		}
	}
}

/**
 * Factory function to create LanceDB hybrid search instance
 */
export function createLanceDBHybridSearch(config: LanceDBConfig): LanceDBHybridSearch {
	return new LanceDBHybridSearch(config);
}

/**
 * Default configuration for brAInwav Cortex-OS
 */
export const defaultLanceDBConfig: LanceDBConfig = {
	uri: process.env.LANCEDB_URI || './data/lancedb',
	tableName: 'cortex_graphrag',
	dimensions: 1024,
	hybridMode: 'rrf',
	densityWeight: 0.7,
	queryTimeout: 30000,
	maxRetries: 3,
	brainwavBranding: true,
};
