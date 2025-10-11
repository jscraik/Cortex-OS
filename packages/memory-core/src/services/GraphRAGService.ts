/**
 * GraphRAG Service for brAInwav Cortex-OS
 *
 * Implements the hybrid retrieval pipeline:
 * 1. Qdrant hybrid search (dense + sparse)
 * 2. Lift Qdrant points to graph nodes stored in Prisma/SQLite
 * 3. One-hop graph expansion with edge whitelisting
 * 4. Context assembly with prioritized chunk selection
 * 5. brAInwav-branded response with optional citations
 */

import { SecureNeo4j } from '@cortex-os/utils';
import { GraphEdgeType, GraphNodeType } from '@prisma/client';
import { z } from 'zod';
import { createPrefixedId } from '../../../agents/src/lib/secure-random.js';
import { prisma, shutdownPrisma } from '../db/prismaClient.js';
import { assembleContext } from '../retrieval/contextAssembler.js';
import { expandNeighbors } from '../retrieval/expandGraph.js';
import {
	type GraphRAGSearchResult,
	QdrantConfigSchema,
	QdrantHybridSearch,
} from '../retrieval/QdrantHybrid.js';
import {
	type ExternalCitationProvider,
	type ExternalProviderConfig,
	MCPKnowledgeProvider,
	validateProviderConfig,
} from './external/ExternalKnowledge.js';

const DEFAULT_QDRANT_CONFIG = {
	url: process.env.QDRANT_URL ?? 'http://localhost:6333',
	apiKey: process.env.QDRANT_API_KEY,
	collection: process.env.QDRANT_COLLECTION ?? 'local_memory_v1',
	timeout: 30000,
	maxRetries: 3,
	brainwavBranding: true,
};

export const GraphRAGServiceConfigSchema = z.object({
	qdrant: QdrantConfigSchema.default(DEFAULT_QDRANT_CONFIG),
	expansion: z.object({
		allowedEdges: z
			.array(z.nativeEnum(GraphEdgeType))
			.default([
				GraphEdgeType.IMPORTS,
				GraphEdgeType.DEPENDS_ON,
				GraphEdgeType.IMPLEMENTS_CONTRACT,
				GraphEdgeType.CALLS_TOOL,
				GraphEdgeType.EMITS_EVENT,
				GraphEdgeType.EXPOSES_PORT,
				GraphEdgeType.REFERENCES_DOC,
				GraphEdgeType.DECIDES_WITH,
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
	externalKg: z
		.object({
			enabled: z.boolean().default(false),
			provider: z.enum(['none', 'neo4j', 'mcp']).default('none'),
			// Neo4j specific settings
			uri: z.string().min(1).optional(),
			user: z.string().min(1).optional(),
			password: z.string().min(1).optional(),
			// MCP specific settings
			slug: z.string().optional(),
			tool: z.string().optional(),
			maxResults: z.number().int().min(1).max(50).default(5),
			requestTimeoutMs: z.number().int().min(1000).max(30000).default(10000),
			// Common settings
			maxDepth: z.number().int().min(1).max(3).default(1),
			citationPrefix: z.string().default('neo4j'),
		})
		.default({
			enabled: false,
			provider: 'none',
			maxDepth: 1,
			citationPrefix: 'neo4j',
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
		nodeType: GraphNodeType;
		nodeKey: string;
	}>;
	nodes: Array<{
		id: string;
		type: GraphNodeType;
		key: string;
		label: string;
		meta: unknown;
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
		externalKgEnriched?: boolean;
	};
	citations?: Array<{
		path: string;
		lines?: string;
		nodeType: GraphNodeType;
		relevanceScore: number;
		brainwavIndexed: boolean;
	}>;
}

interface QueryReservation {
	queryId: string;
	startTime: number;
	release: () => void;
}

const MAX_EXTERNAL_CITATIONS = 16;

export class GraphRAGService {
	private readonly qdrant: QdrantHybridSearch;
	private readonly config: GraphRAGServiceConfig;
	private readonly activeQueries = new Set<string>();
	private readonly externalKg?: {
		driver: SecureNeo4j;
		maxDepth: number;
		prefix: string;
	};
	private readonly externalProvider?: ExternalCitationProvider;

	constructor(config: GraphRAGServiceConfig) {
		this.config = GraphRAGServiceConfigSchema.parse(config);
		this.qdrant = new QdrantHybridSearch(this.config.qdrant);

		if (this.config.externalKg.enabled) {
			const { provider } = this.config.externalKg;

			if (provider === 'neo4j') {
				const { uri, user, password, maxDepth, citationPrefix } = this.config.externalKg;
				if (uri && user && password) {
					this.externalKg = {
						driver: new SecureNeo4j(uri, user, password),
						maxDepth,
						prefix: citationPrefix,
					};
				} else {
					console.warn('brAInwav GraphRAG external KG credentials incomplete', {
						component: 'memory-core',
						brand: 'brAInwav',
						provider: 'neo4j',
						severity: 'warning',
						action: 'skipping_external_enrichment',
					});
				}
			} else if (provider === 'mcp') {
				this.externalProvider = new MCPKnowledgeProvider();
			} else {
				console.warn('brAInwav GraphRAG external KG provider not supported', {
					component: 'memory-core',
					brand: 'brAInwav',
					provider,
					severity: 'warning',
					action: 'skipping_external_enrichment',
				});
			}
		}
	}

	async initialize(
		embedDenseFunc: (text: string) => Promise<number[]>,
		embedSparseFunc: (text: string) => Promise<{ indices: number[]; values: number[] }>,
	): Promise<void> {
		await this.qdrant.initialize(embedDenseFunc, embedSparseFunc);

		// Initialize external provider if configured
		if (this.externalProvider && this.config.externalKg.provider === 'mcp') {
			try {
				const providerConfig: ExternalProviderConfig = {
					provider: 'mcp',
					settings: {
						slug: this.config.externalKg.slug || 'arxiv-1',
						tool: this.config.externalKg.tool || 'search_papers',
						maxResults: this.config.externalKg.maxResults,
						requestTimeoutMs: this.config.externalKg.requestTimeoutMs,
					},
				};

				await this.externalProvider.initialize(providerConfig);

				if (this.config.branding.enabled) {
					console.info('brAInwav GraphRAG MCP external provider initialized', {
						component: 'memory-core',
						brand: 'brAInwav',
						provider: this.config.externalKg.provider,
						status: 'success',
					});
				}
			} catch (error) {
				console.warn('brAInwav GraphRAG failed to initialize MCP external provider', {
					component: 'memory-core',
					brand: 'brAInwav',
					provider: this.config.externalKg.provider,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		if (this.config.branding.enabled) {
			console.info('brAInwav GraphRAG service initialized', {
				component: 'memory-core',
				brand: 'brAInwav',
				status: 'ready',
				externalKg: this.config.externalKg.enabled,
				provider: this.config.externalKg.provider,
			});
		}
	}

	async query(params: GraphRAGQueryRequest): Promise<GraphRAGResult> {
		const reservation = this.reserveQuerySlot();

		try {
			const validated = GraphRAGQueryRequestSchema.parse(params);
			const seeds = await this.hybridSeedSearch(validated);
			const focusNodeIds = await this.liftToGraphNodes(seeds);

			const expansion = await expandNeighbors(focusNodeIds, {
				allowedEdges: this.config.expansion.allowedEdges as GraphEdgeType[],
				maxNeighborsPerNode: this.config.expansion.maxNeighborsPerNode,
			});

			const allNodeIds = [...focusNodeIds, ...expansion.neighborIds];
			const context = await assembleContext(
				allNodeIds,
				Math.min(validated.maxChunks, this.config.limits.maxContextChunks),
				seeds,
			);

			const result = this.buildResult(context, expansion, reservation.startTime, seeds);

			if (validated.includeCitations) {
				result.citations = this.formatCitations(context.chunks);
			}

			// Fetch external citations from Neo4j if configured
			if (this.externalKg && focusNodeIds.length > 0) {
				const kgCitations = await this.fetchExternalCitations(focusNodeIds);
				if (kgCitations.length > 0) {
					const existing = result.citations ?? [];
					const combined = [...existing];
					for (const citation of kgCitations) {
						if (
							!combined.some((c) => c.path === citation.path && c.nodeType === citation.nodeType)
						) {
							combined.push(citation);
						}
					}
					result.citations = combined;
					result.metadata.externalKgEnriched = true;
				}
			}

			// Fetch external citations from MCP provider if configured
			if (this.externalProvider && this.config.externalKg.provider === 'mcp') {
				try {
					const mcpCitations = await this.fetchMcpCitations(validated.question, seeds);
					if (mcpCitations.length > 0) {
						const existing = result.citations ?? [];
						const combined = [...existing];

						// Merge citations without duplicating paths
						const seenPaths = new Set(combined.map((c) => c.path));
						for (const citation of mcpCitations) {
							if (!seenPaths.has(citation.path)) {
								combined.push({
									path: citation.path,
									nodeType: GraphNodeType.DOC,
									relevanceScore: 0,
									brainwavIndexed: false,
								});
								seenPaths.add(citation.path);
							}
						}

						result.citations = combined;
						result.metadata.externalKgEnriched = true;
					}
				} catch (error) {
					console.warn('brAInwav GraphRAG failed to fetch MCP citations', {
						component: 'memory-core',
						brand: 'brAInwav',
						question: validated.question,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}

			if (this.config.branding.emitBrandedEvents) {
				await this.emitQueryEvent('completed', {
					queryId: reservation.queryId,
					question: validated.question,
					focusNodes: focusNodeIds.length,
					expandedNodes: expansion.neighborIds.length,
					totalChunks: context.chunks.length,
					durationMs: Date.now() - reservation.startTime,
				});
			}

			return result;
		} catch (error) {
			if (this.config.branding.emitBrandedEvents) {
				await this.emitQueryEvent('failed', {
					queryId: reservation.queryId,
					question: params.question,
					error: error instanceof Error ? error.message : String(error),
					durationMs: Date.now() - reservation.startTime,
				});
			}
			throw error;
		} finally {
			reservation.release();
		}
	}

	async healthCheck(): Promise<{
		status: 'healthy' | 'unhealthy';
		components: { qdrant: boolean; prisma: boolean };
		brainwavSource: string;
	}> {
		try {
			const [qdrantHealthy, prismaHealthy] = await Promise.all([
				this.qdrant.healthCheck(),
				prisma.$queryRaw`SELECT 1`.then(
					() => true,
					() => false,
				),
			]);

			const healthy = qdrantHealthy && prismaHealthy;
			return {
				status: healthy ? 'healthy' : 'unhealthy',
				components: { qdrant: qdrantHealthy, prisma: prismaHealthy },
				brainwavSource: this.config.branding.sourceAttribution,
			};
		} catch {
			return {
				status: 'unhealthy',
				components: { qdrant: false, prisma: false },
				brainwavSource: this.config.branding.sourceAttribution,
			};
		}
	}

	async getStats(): Promise<{
		totalNodes: number;
		totalEdges: number;
		totalChunks: number;
		nodeTypeDistribution: Record<string, number>;
		edgeTypeDistribution: Record<string, number>;
		brainwavSource: string;
	}> {
		const [nodeStats, edgeStats, chunkCount] = await Promise.all([
			prisma.graphNode.groupBy({ by: ['type'], _count: { type: true } }),
			prisma.graphEdge.groupBy({ by: ['type'], _count: { type: true } }),
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

	async close(): Promise<void> {
		await this.qdrant.close();
		await this.externalKg?.driver.close();
		await this.externalProvider?.dispose?.();
		await shutdownPrisma();
		if (this.config.branding.enabled) {
			console.info('brAInwav GraphRAG service closed', {
				component: 'memory-core',
				brand: 'brAInwav',
				status: 'shutdown',
			});
		}
	}

	private reserveQuerySlot(): QueryReservation {
		if (this.activeQueries.size >= this.config.limits.maxConcurrentQueries) {
			throw new Error('brAInwav GraphRAG: Maximum concurrent queries exceeded');
		}

		const queryId = createPrefixedId(`graphrag_${Date.now()}_`);
		this.activeQueries.add(queryId);

		return {
			queryId,
			startTime: Date.now(),
			release: () => {
				this.activeQueries.delete(queryId);
			},
		};
	}

	private async hybridSeedSearch(params: GraphRAGQueryRequest): Promise<GraphRAGSearchResult[]> {
		return this.qdrant.hybridSearch({
			question: params.question,
			k: params.k,
			threshold: params.threshold,
			includeVectors: params.includeVectors,
			namespace: params.namespace,
			filters: params.filters,
		});
	}

	private async liftToGraphNodes(seedResults: GraphRAGSearchResult[]): Promise<string[]> {
		if (seedResults.length === 0) {
			return [];
		}

		const qdrantIds = seedResults.map((result) => result.id);
		const chunkRefs = await prisma.chunkRef.findMany({
			where: { qdrantId: { in: qdrantIds } },
			select: { nodeId: true },
		});

		return [...new Set(chunkRefs.map((ref) => ref.nodeId))];
	}

	private buildResult(
		context: Awaited<ReturnType<typeof assembleContext>>,
		expansion: Awaited<ReturnType<typeof expandNeighbors>>,
		startTime: number,
		seeds: GraphRAGSearchResult[],
	): GraphRAGResult {
		return {
			answer: seeds[0]?.chunkContent,
			sources: context.chunks,
			graphContext: {
				focusNodes: new Set(context.chunks.map((chunk) => chunk.nodeId)).size,
				expandedNodes: expansion.neighborIds.length,
				totalChunks: context.chunks.length,
				edgesTraversed: expansion.edges.length,
			},
			metadata: {
				brainwavPowered: this.config.branding.enabled,
				retrievalDurationMs: Date.now() - startTime,
				queryTimestamp: new Date().toISOString(),
				brainwavSource: this.config.branding.sourceAttribution,
			},
		};
	}

	private formatCitations(chunks: GraphRAGContext['chunks']): GraphRAGResult['citations'] {
		return chunks.map((chunk) => ({
			path: chunk.path,
			lines:
				chunk.lineStart !== undefined && chunk.lineEnd !== undefined
					? `${chunk.lineStart}-${chunk.lineEnd}`
					: undefined,
			nodeType: chunk.nodeType,
			relevanceScore: chunk.score,
			brainwavIndexed: this.config.branding.enabled,
		}));
	}

	private async fetchExternalCitations(nodeIds: string[]): Promise<GraphRAGResult['citations']> {
		if (!this.externalKg) return [];

		const citations: GraphRAGResult['citations'] = [];
		const seenPaths = new Set<string>();

		for (const nodeId of nodeIds) {
			try {
				const neighborhood = await this.externalKg.driver.neighborhood(
					nodeId,
					this.externalKg.maxDepth,
				);
				const nodes = neighborhood?.nodes ?? [];
				for (const node of nodes) {
					const label =
						typeof node.label === 'string' && node.label.length > 0 ? node.label : node.id;
					const path = `${this.externalKg.prefix}:${label}`;
					if (seenPaths.has(path) || citations.length >= MAX_EXTERNAL_CITATIONS) {
						continue;
					}
					seenPaths.add(path);
					citations.push({
						path,
						lines: undefined,
						nodeType: GraphNodeType.DOC,
						relevanceScore: 0,
						brainwavIndexed: false,
					});
				}
			} catch (error) {
				console.warn('brAInwav GraphRAG external KG enrichment failed', {
					component: 'memory-core',
					brand: 'brAInwav',
					nodeId,
					error: error instanceof Error ? error.message : String(error),
					severity: 'warning',
				});
			}

			if (citations.length >= MAX_EXTERNAL_CITATIONS) {
				break;
			}
		}

		return citations;
	}

	private async fetchMcpCitations(
		question: string,
		seeds: GraphRAGSearchResult[],
	): Promise<{ path: string }[]> {
		if (!this.externalProvider) {
			return [];
		}

		try {
			const citations = await this.externalProvider.fetchCitations(question, {
				maxResults: this.config.externalKg.maxResults,
				timeoutMs: this.config.externalKg.requestTimeoutMs,
			});

			return citations.map((citation) => ({
				path: citation.path,
			}));
		} catch (error) {
			console.warn('brAInwav GraphRAG MCP citation fetch failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				provider: this.config.externalKg.provider,
				question,
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
	}

	private async emitQueryEvent(
		type: 'completed' | 'failed',
		data: Record<string, unknown>,
	): Promise<void> {
		try {
			const event = {
				type: `graphrag.query.${type}`,
				source: 'brAInwav.memory-core.graphrag',
				data: {
					...data,
					brainwavSource: this.config.branding.sourceAttribution,
				},
				timestamp: new Date().toISOString(),
			};

			console.info('brAInwav A2A Event emitted', {
				component: 'memory-core',
				brand: 'brAInwav',
				eventType: event.type,
				source: event.source,
				timestamp: event.timestamp,
			});
		} catch (error) {
			console.error('brAInwav GraphRAG event emission failed', {
				component: 'memory-core',
				brand: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
				severity: 'error',
			});
		}
	}
}

export function createGraphRAGService(config?: Partial<GraphRAGServiceConfig>): GraphRAGService {
	const baseConfig: GraphRAGServiceConfig = {
		qdrant: DEFAULT_QDRANT_CONFIG,
		expansion: {
			allowedEdges: [
				GraphEdgeType.IMPORTS,
				GraphEdgeType.DEPENDS_ON,
				GraphEdgeType.IMPLEMENTS_CONTRACT,
				GraphEdgeType.CALLS_TOOL,
				GraphEdgeType.EMITS_EVENT,
				GraphEdgeType.EXPOSES_PORT,
				GraphEdgeType.REFERENCES_DOC,
				GraphEdgeType.DECIDES_WITH,
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
		externalKg: {
			enabled: false,
			maxDepth: 1,
			citationPrefix: 'neo4j',
		},
	};

	const externalKgBase = {
		enabled: process.env.EXTERNAL_KG_ENABLED === 'true',
		provider: (process.env.EXTERNAL_KG_PROVIDER as 'none' | 'neo4j' | 'mcp') || 'none',
		// Neo4j settings
		uri: process.env.NEO4J_URI,
		user: process.env.NEO4J_USER,
		password: process.env.NEO4J_PASSWORD,
		// MCP settings
		slug: process.env.ARXIV_MCP_SLUG || 'arxiv-1',
		tool: process.env.ARXIV_MCP_SEARCH_TOOL || 'search_papers',
		maxResults: parseInt(process.env.ARXIV_MCP_MAX_RESULTS || '5', 10),
		requestTimeoutMs: parseInt(process.env.ARXIV_MCP_REQUEST_TIMEOUT || '10000', 10),
		// Common settings
		maxDepth: 1,
		citationPrefix: 'neo4j',
	};

	const mergedConfig: GraphRAGServiceConfig = {
		qdrant: { ...baseConfig.qdrant, ...config?.qdrant },
		expansion: { ...baseConfig.expansion, ...config?.expansion },
		limits: { ...baseConfig.limits, ...config?.limits },
		branding: { ...baseConfig.branding, ...config?.branding },
		externalKg: { ...externalKgBase, ...config?.externalKg },
	};

	return new GraphRAGService(mergedConfig);
}
