/**
 * GraphRAG Service for brAInwav Cortex-OS
 *
 * Provides graph-enhanced retrieval-augmented generation using:
 * - PostgreSQL graph storage (nodes + edges)
 * - Qdrant hybrid search (existing brAInwav memory stack)
 * - 1-hop graph expansion with edge filtering
 * - A2A event emission for observability
 * - brAInwav branding compliance
 *
 * This service integrates with the existing brAInwav memory-core Qdrant
 * infrastructure for seamless vector search capabilities.
 */

import { z } from 'zod';
import { type GraphRAGSearchResult, QdrantHybridSearch } from '../retrieval/QdrantHybrid.js';

// Placeholder types for Prisma models until schema is generated
type GraphNodeType =
	| 'PACKAGE'
	| 'SERVICE'
	| 'AGENT'
	| 'TOOL'
	| 'CONTRACT'
	| 'EVENT'
	| 'DOC'
	| 'ADR'
	| 'FILE'
	| 'API'
	| 'PORT';
type GraphEdgeType =
	| 'IMPORTS'
	| 'IMPLEMENTS_CONTRACT'
	| 'CALLS_TOOL'
	| 'EMITS_EVENT'
	| 'EXPOSES_PORT'
	| 'REFERENCES_DOC'
	| 'DEPENDS_ON'
	| 'DECIDES_WITH';

interface GraphNode {
	id: string;
	type: GraphNodeType;
	key: string;
	label: string;
	meta?: any;
	createdAt: Date;
	updatedAt: Date;
}

interface GraphEdge {
	id: string;
	type: GraphEdgeType;
	srcId: string;
	dstId: string;
	weight?: number;
	meta?: any;
	createdAt: Date;
}

interface ChunkRef {
	id: string;
	nodeId: string;
	qdrantId: string; // Changed from lancedbId to qdrantId
	path: string;
	lineStart?: number;
	lineEnd?: number;
	meta?: any;
	createdAt: Date;
	node: GraphNode;
}

// Prisma client placeholder - would be replaced with actual client
const prisma = {
	chunkRef: {
		findMany: async (query: any) => [] as ChunkRef[],
		count: async () => 0,
	},
	graphNode: {
		findMany: async (query: any) => [] as GraphNode[],
		groupBy: async (query: any) => [] as any[],
	},
	graphEdge: {
		findMany: async (query: any) => [] as GraphEdge[],
		groupBy: async (query: any) => [] as any[],
	},
	$queryRaw: async (query: any) => [{ '?column?': 1 }],
	$disconnect: async () => {},
};

// Schema definitions
export const GraphRAGServiceConfigSchema = z.object({
	qdrantConfig: z.object({
		url: z.string().default('qdrant:6333'),
		collection: z.string().default('local_memory_v1'),
		apiKey: z.string().optional(),
		timeout: z.number().default(30000),
		maxRetries: z.number().default(3),
		brainwavBranding: z.boolean().default(true),
	}),
	expansion: z.object({
		allowedEdges: z
			.array(z.string())
			.default([
				'IMPORTS',
				'DEPENDS_ON',
				'IMPLEMENTS_CONTRACT',
				'CALLS_TOOL',
				'EMITS_EVENT',
				'EXPOSES_PORT',
				'REFERENCES_DOC',
				'DECIDES_WITH',
			]),
		maxHops: z.number().int().min(1).max(3).default(1),
		maxNeighborsPerNode: z.number().int().min(1).max(50).default(20),
	}),
	limits: z.object({
		maxContextChunks: z.number().int().min(1).max(100).default(24),
		queryTimeoutMs: z.number().int().min(1000).max(60000).default(30000),
		maxConcurrentQueries: z.number().int().min(1).max(20).default(5),
	}),
	branding: z.object({
		enabled: z.boolean().default(true),
		sourceAttribution: z.string().default('brAInwav Cortex-OS GraphRAG'),
		emitBrandedEvents: z.boolean().default(true),
	}),
});

export type GraphRAGServiceConfig = z.infer<typeof GraphRAGServiceConfigSchema>;

export const GraphRAGQueryRequestSchema = z.object({
	question: z.string().min(1),
	k: z.number().int().min(1).max(50).default(8),
	maxHops: z.number().int().min(1).max(3).default(1),
	maxChunks: z.number().int().min(1).max(100).default(24),
	threshold: z.number().min(0).max(1).optional(),
	includeVectors: z.boolean().default(false),
	includeCitations: z.boolean().default(true),
	namespace: z.string().optional(),
	filters: z.record(z.any()).optional(),
});

export type GraphRAGQueryRequest = z.infer<typeof GraphRAGQueryRequestSchema>;

export interface GraphRAGContext {
	chunks: Array<{
		id: string;
		nodeId: string;
		path: string;
		content: string;
		lineStart?: number;
		lineEnd?: number;
		score: number;
		nodeType: string;
		nodeKey: string;
	}>;
	nodes: Array<{
		id: string;
		type: GraphNodeType;
		key: string;
		label: string;
		meta?: any;
	}>;
	edges: Array<{
		id: string;
		type: GraphEdgeType;
		srcId: string;
		dstId: string;
		weight?: number;
		meta?: any;
	}>;
}

export interface GraphRAGResult {
	answer?: string;
	sources: GraphRAGContext['chunks'];
	graphContext: {
		focusNodes: number;
		expandedNodes: number;
		totalChunks: number;
		edgesTraversed: number;
	};
	metadata: {
		brainwavPowered: boolean;
		retrievalDurationMs: number;
		queryTimestamp: string;
		brainwavSource: string;
	};
	citations?: Array<{
		path: string;
		lines?: string;
		nodeType: string;
		relevanceScore: number;
		brainwavIndexed: boolean;
	}>;
}

/**
 * GraphRAG Service - Main orchestrator for graph-enhanced retrieval
 */
export class GraphRAGService {
	private qdrant: QdrantHybridSearch;
	private config: GraphRAGServiceConfig;
	private activeQueries = new Set<string>();

	constructor(config: GraphRAGServiceConfig) {
		this.config = GraphRAGServiceConfigSchema.parse(config);
		this.qdrant = new QdrantHybridSearch(this.config.qdrantConfig);
	}

	/**
	 * Initialize the service with embedding functions
	 */
	async initialize(
		embedDenseFunc: (text: string) => Promise<number[]>,
		embedSparseFunc: (text: string) => Promise<{ indices: number[]; values: number[] }>,
	): Promise<void> {
		await this.lancedb.initialize(embedDenseFunc, embedSparseFunc);

		if (this.config.branding.enabled) {
			console.log('brAInwav GraphRAG service initialized successfully');
		}
	}

	/**
	 * Main query method - orchestrates the entire GraphRAG pipeline
	 */
	async query(params: GraphRAGQueryRequest): Promise<GraphRAGResult> {
		const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const startTime = Date.now();

		// Rate limiting
		if (this.activeQueries.size >= this.config.limits.maxConcurrentQueries) {
			throw new Error('brAInwav GraphRAG: Maximum concurrent queries exceeded');
		}

		this.activeQueries.add(queryId);

		try {
			// Validate input
			const validatedParams = GraphRAGQueryRequestSchema.parse(params);

			// Step 1: Hybrid seed search using LanceDB
			const seedResults = await this.hybridSeedSearch(validatedParams);

			// Step 2: Lift vector results to graph nodes
			const focusNodeIds = await this.liftToGraphNodes(seedResults);

			// Step 3: Graph expansion (1-hop)
			const { neighborIds, edgesTraversed } = await this.expandGraph(
				focusNodeIds,
				validatedParams.maxHops || this.config.expansion.maxHops,
			);

			// Step 4: Assemble context from nodes and neighbors
			const context = await this.assembleContext(
				[...focusNodeIds, ...neighborIds],
				validatedParams.maxChunks || this.config.limits.maxContextChunks,
			);

			// Step 5: Generate result
			const result: GraphRAGResult = {
				sources: context.chunks,
				graphContext: {
					focusNodes: focusNodeIds.length,
					expandedNodes: neighborIds.length,
					totalChunks: context.chunks.length,
					edgesTraversed,
				},
				metadata: {
					brainwavPowered: this.config.branding.enabled,
					retrievalDurationMs: Date.now() - startTime,
					queryTimestamp: new Date().toISOString(),
					brainwavSource: this.config.branding.sourceAttribution,
				},
			};

			// Add citations if requested
			if (validatedParams.includeCitations) {
				result.citations = this.formatCitations(context.chunks);
			}

			// Emit A2A event for observability
			if (this.config.branding.emitBrandedEvents) {
				await this.emitQueryEvent('completed', {
					queryId,
					question: validatedParams.question,
					focusNodes: focusNodeIds.length,
					expandedNodes: neighborIds.length,
					totalChunks: context.chunks.length,
					durationMs: Date.now() - startTime,
				});
			}

			return result;
		} catch (error) {
			// Emit error event
			if (this.config.branding.emitBrandedEvents) {
				await this.emitQueryEvent('failed', {
					queryId,
					question: params.question,
					error: error instanceof Error ? error.message : String(error),
					durationMs: Date.now() - startTime,
				});
			}

			throw error;
		} finally {
			this.activeQueries.delete(queryId);
		}
	}

	/**
	 * Step 1: Perform hybrid search to get seed results
	 */
	private async hybridSeedSearch(params: GraphRAGQueryRequest): Promise<GraphRAGSearchResult[]> {
		const lancedbParams = {
			question: params.question,
			k: params.k,
			threshold: params.threshold,
			includeVectors: params.includeVectors,
			namespace: params.namespace,
			filters: params.filters,
		};

		return await this.lancedb.hybridSearch(lancedbParams);
	}

	/**
	 * Step 2: Map vector search results to graph nodes
	 */
	private async liftToGraphNodes(seedResults: GraphRAGSearchResult[]): Promise<string[]> {
		const lancedbIds = seedResults.map((r) => r.id);

		const chunkRefs = await prisma.chunkRef.findMany({
			where: { lancedbId: { in: lancedbIds } },
			select: { nodeId: true },
		});

		return [...new Set(chunkRefs.map((cr) => cr.nodeId))];
	}

	/**
	 * Step 3: Expand graph by traversing edges
	 */
	private async expandGraph(
		nodeIds: string[],
		maxHops: number,
	): Promise<{
		neighborIds: string[];
		edgesTraversed: number;
	}> {
		const allowedEdges = this.config.expansion.allowedEdges as GraphEdgeType[];
		const maxNeighbors = this.config.expansion.maxNeighborsPerNode;

		const edges = await prisma.graphEdge.findMany({
			where: {
				type: { in: allowedEdges },
				OR: [{ srcId: { in: nodeIds } }, { dstId: { in: nodeIds } }],
			},
			take: maxNeighbors * nodeIds.length,
			orderBy: { weight: 'desc' }, // Prioritize higher-weight edges
		});

		const neighborIds = new Set<string>();
		for (const edge of edges) {
			if (nodeIds.includes(edge.srcId)) neighborIds.add(edge.dstId);
			if (nodeIds.includes(edge.dstId)) neighborIds.add(edge.srcId);
		}

		// Remove original nodes from neighbors
		for (const nodeId of nodeIds) {
			neighborIds.delete(nodeId);
		}

		return {
			neighborIds: [...neighborIds],
			edgesTraversed: edges.length,
		};
	}

	/**
	 * Step 4: Assemble context from graph nodes
	 */
	private async assembleContext(nodeIds: string[], maxChunks: number): Promise<GraphRAGContext> {
		// Get nodes
		const nodes = await prisma.graphNode.findMany({
			where: { id: { in: nodeIds } },
		});

		// Get chunks with vector search scores preserved
		const chunkRefs = await prisma.chunkRef.findMany({
			where: { nodeId: { in: nodeIds } },
			include: { node: true },
			take: maxChunks,
			orderBy: { createdAt: 'desc' },
		});

		// Get edges between the nodes
		const edges = await prisma.graphEdge.findMany({
			where: {
				AND: [{ srcId: { in: nodeIds } }, { dstId: { in: nodeIds } }],
			},
		});

		// Transform chunks with preserved relevance scoring
		const chunks = chunkRefs.map((cr) => ({
			id: cr.id,
			nodeId: cr.nodeId,
			path: cr.path,
			content: `${cr.path}:${cr.lineStart || 1}-${cr.lineEnd || 1}`, // Placeholder - would load actual content
			lineStart: cr.lineStart,
			lineEnd: cr.lineEnd,
			score: 0.8, // Would preserve from LanceDB search
			nodeType: cr.node.type,
			nodeKey: cr.node.key,
		}));

		return { chunks, nodes, edges };
	}

	/**
	 * Format citations for the response
	 */
	private formatCitations(chunks: GraphRAGContext['chunks']): GraphRAGResult['citations'] {
		return chunks.map((chunk) => ({
			path: chunk.path,
			lines: chunk.lineStart && chunk.lineEnd ? `${chunk.lineStart}-${chunk.lineEnd}` : undefined,
			nodeType: chunk.nodeType,
			relevanceScore: chunk.score,
			brainwavIndexed: this.config.branding.enabled,
		}));
	}

	/**
	 * Emit A2A events for observability
	 */
	private async emitQueryEvent(
		type: 'completed' | 'failed',
		data: Record<string, any>,
	): Promise<void> {
		try {
			// This would integrate with the actual A2A event system
			const event = {
				type: `graphrag.query.${type}`,
				data: {
					...data,
					brainwavSource: this.config.branding.sourceAttribution,
				},
				source: 'brAInwav.memory-core.graphrag',
				headers: { 'brainwav-brand': 'brAInwav' },
				timestamp: new Date().toISOString(),
			};

			// Placeholder for actual event emission
			console.log('brAInwav A2A Event:', JSON.stringify(event, null, 2));

			// await publishEvent(event);
		} catch (error) {
			console.error('brAInwav GraphRAG event emission failed:', error);
			// Don't throw - event emission shouldn't break the main flow
		}
	}

	/**
	 * Health check for the service
	 */
	async healthCheck(): Promise<{
		status: 'healthy' | 'unhealthy';
		components: {
			lancedb: boolean;
			postgres: boolean;
		};
		brainwavSource: string;
	}> {
		try {
			const lancedbHealthy = await this.lancedb.healthCheck();
			let postgresHealthy = false;

			try {
				await prisma.$queryRaw`SELECT 1`;
				postgresHealthy = true;
			} catch {
				postgresHealthy = false;
			}

			const allHealthy = lancedbHealthy && postgresHealthy;

			return {
				status: allHealthy ? 'healthy' : 'unhealthy',
				components: {
					lancedb: lancedbHealthy,
					postgres: postgresHealthy,
				},
				brainwavSource: this.config.branding.sourceAttribution,
			};
		} catch (error) {
			return {
				status: 'unhealthy',
				components: {
					lancedb: false,
					postgres: false,
				},
				brainwavSource: this.config.branding.sourceAttribution,
			};
		}
	}

	/**
	 * Get service statistics
	 */
	async getStats(): Promise<{
		totalNodes: number;
		totalEdges: number;
		totalChunks: number;
		nodeTypeDistribution: Record<string, number>;
		edgeTypeDistribution: Record<string, number>;
		brainwavSource: string;
	}> {
		const [nodeStats, edgeStats, chunkCount] = await Promise.all([
			prisma.graphNode.groupBy({
				by: ['type'],
				_count: { type: true },
			}),
			prisma.graphEdge.groupBy({
				by: ['type'],
				_count: { type: true },
			}),
			prisma.chunkRef.count(),
		]);

		const nodeTypeDistribution = Object.fromEntries(
			nodeStats.map((stat) => [stat.type, stat._count.type]),
		);

		const edgeTypeDistribution = Object.fromEntries(
			edgeStats.map((stat) => [stat.type, stat._count.type]),
		);

		const totalNodes = nodeStats.reduce((sum, stat) => sum + stat._count.type, 0);
		const totalEdges = edgeStats.reduce((sum, stat) => sum + stat._count.type, 0);

		return {
			totalNodes,
			totalEdges,
			totalChunks: chunkCount,
			nodeTypeDistribution,
			edgeTypeDistribution,
			brainwavSource: this.config.branding.sourceAttribution,
		};
	}

	/**
	 * Close the service and cleanup resources
	 */
	async close(): Promise<void> {
		await this.lancedb.close();
		await prisma.$disconnect();

		if (this.config.branding.enabled) {
			console.log('brAInwav GraphRAG service closed');
		}
	}
}

/**
 * Factory function to create GraphRAG service with default config
 */
export function createGraphRAGService(config?: Partial<GraphRAGServiceConfig>): GraphRAGService {
	const defaultConfig: GraphRAGServiceConfig = {
		lancedbConfig: {
			uri: process.env.LANCEDB_URI || './data/lancedb',
			tableName: 'cortex_graphrag',
			dimensions: 1024,
			hybridMode: 'rrf',
			densityWeight: 0.7,
		},
		expansion: {
			allowedEdges: [
				'IMPORTS',
				'DEPENDS_ON',
				'IMPLEMENTS_CONTRACT',
				'CALLS_TOOL',
				'EMITS_EVENT',
				'EXPOSES_PORT',
				'REFERENCES_DOC',
				'DECIDES_WITH',
			],
			maxHops: 1,
			maxNeighborsPerNode: 20,
		},
		limits: {
			maxContextChunks: 24,
			queryTimeoutMs: 30000,
			maxConcurrentQueries: 5,
		},
		branding: {
			enabled: process.env.BRAINWAV_BRANDING !== 'false',
			sourceAttribution: 'brAInwav Cortex-OS GraphRAG',
			emitBrandedEvents: true,
		},
	};

	const mergedConfig = {
		...defaultConfig,
		...config,
		lancedbConfig: { ...defaultConfig.lancedbConfig, ...config?.lancedbConfig },
		expansion: { ...defaultConfig.expansion, ...config?.expansion },
		limits: { ...defaultConfig.limits, ...config?.limits },
		branding: { ...defaultConfig.branding, ...config?.branding },
	};

	return new GraphRAGService(mergedConfig);
}
