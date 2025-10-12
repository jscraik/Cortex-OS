/**
 * Context Slice Service for brAInwav Cortex-OS
 *
 * Implements topology-bounded context slicing with evidence filtering,
 * thermal constraints, and integration with GraphRAG service.
 *
 * Key Features:
 * - Context slicing with depth and breadth limits
 * - Evidence gating and ABAC compliance
 * - Thermal-aware operation constraints
 * - Integration with existing GraphRAG service
 * - Performance monitoring and metrics
 */

import { randomUUID } from 'node:crypto';
import type { GraphNodeType } from '@prisma/client';
import { GraphEdgeType } from '../db/prismaEnums.js';
import { z } from 'zod';
import type { GraphRAGResult, GraphRAGService } from '../services/GraphRAGService.js';
import { EvidenceGate } from './evidence/EvidenceGate.js';
import { ThermalMonitor } from '../thermal/ThermalMonitor.js';

export const ContextSliceRecipeSchema = z.object({
	query: z.string().min(1, 'Query cannot be empty'),
	maxDepth: z
		.number()
		.int()
		.min(1, 'Max depth must be positive')
		.max(5, 'Max depth cannot exceed 5'),
	maxNodes: z
		.number()
		.int()
		.min(1, 'Max nodes must be positive')
		.max(100, 'Max nodes cannot exceed 100'),
	allowedEdgeTypes: z
		.array(z.nativeEnum(GraphEdgeType))
		.min(1, 'At least one edge type must be specified'),
	filters: z.record(z.any()).optional(),
	evidenceRequired: z.boolean().default(false),
	thermalConstraints: z.boolean().default(true),
	requestId: z.string().optional(),
});

export type ContextSliceRecipe = z.infer<typeof ContextSliceRecipeSchema>;

export interface ContextSubgraph {
	nodes: Array<{
		id: string;
		type: GraphNodeType;
		key: string;
		label: string;
		path: string;
		content: string;
		score: number;
		metadata: Record<string, any>;
	}>;
	edges: Array<{
		id: string;
		from: string;
		to: string;
		type: string;
		metadata: Record<string, any>;
	}>;
        metadata: {
                focusNodes: number;
                expandedNodes: number;
                totalChunks: number;
                edgesTraversed: number;
                depthUsed: number;
                nodesExplored: number;
                sliceDuration: number;
                brainwavGenerated: boolean;
                brainwavBranded: boolean;
                maxDepthUsed?: number;
                maxNodesUsed?: number;
        };
}

export interface ContextSliceResult {
	subgraph: ContextSubgraph;
	metadata: {
		sliceDuration: number;
		brainwavBranded: boolean;
		brainwavOperationId: string;
		evidenceFiltered?: boolean;
		evidenceReason?: string;
		thermalConstrained?: boolean;
		depthUsed?: number;
		nodesExplored?: number;
		error?: string;
		metrics?: {
			nodesProcessed: number;
			edgesProcessed: number;
			sliceDuration: number;
			brainwavOperationId: string;
		};
	};
	evidence?: any;
	thermalStatus?: any;
}

export interface ValidationResult {
	valid: boolean;
	errors: string[];
}

export class ContextSliceService {
	private readonly graphRAGService: GraphRAGService;
	private readonly evidenceGate: EvidenceGate;
	private readonly thermalMonitor: ThermalMonitor;

	constructor(graphRAGService: GraphRAGService) {
		this.graphRAGService = graphRAGService;
		this.evidenceGate = new EvidenceGate();
		this.thermalMonitor = new ThermalMonitor();
	}

	async slice(recipe: ContextSliceRecipe): Promise<ContextSliceResult> {
		const startTime = Date.now();
		const operationId = `cortex-slice-${randomUUID()}`;

		try {
			// Validate input parameters
			const validation = await this.validateRecipe(recipe);
			if (!validation.valid) {
				return this.createErrorResult(validation.errors[0], operationId, startTime);
			}

			// Apply evidence filtering if required
			if (recipe.evidenceRequired) {
				const evidenceResult = await this.evidenceGate.validateAccess({
					user: { id: 'system', role: 'system' },
					resource: { id: recipe.query, type: 'context_slice' },
					action: 'read',
					requestId: operationId,
				});

				if (!evidenceResult.granted) {
					return {
						subgraph: { nodes: [], edges: [], metadata: this.createSubgraphMetadata() },
						metadata: {
							sliceDuration: Date.now() - startTime,
							brainwavBranded: true,
							brainwavOperationId: operationId,
							evidenceFiltered: true,
							evidenceReason: evidenceResult.reason || 'Access denied by evidence gate',
						},
					};
				}
			}

			// Apply thermal constraints if enabled
			let effectiveRecipe = recipe;
			if (recipe.thermalConstraints) {
				const thermalConstraints = await this.thermalMonitor.getConstraints();
				if (thermalConstraints.throttlingActive) {
					effectiveRecipe = {
						...recipe,
						maxDepth: Math.min(recipe.maxDepth, thermalConstraints.maxDepth),
						maxNodes: Math.min(recipe.maxNodes, thermalConstraints.maxNodes),
					};
				}
			}

			// Perform GraphRAG query
                        const graphRAGResult = await this.graphRAGService.query({
                                question: effectiveRecipe.query,
                                k: effectiveRecipe.maxNodes,
                                maxHops: effectiveRecipe.maxDepth,
                                maxChunks: effectiveRecipe.maxNodes,
                                includeVectors: false,
                                includeCitations: true,
                                filters: effectiveRecipe.filters,
                        });

			// Build subgraph from GraphRAG results
			const subgraph = await this.buildSubgraph(graphRAGResult, effectiveRecipe);

			const sliceDuration = Date.now() - startTime;

			return {
				subgraph,
				metadata: {
					sliceDuration,
					brainwavBranded: true,
					brainwavOperationId: operationId,
					thermalConstrained:
						recipe.thermalConstraints && effectiveRecipe.maxDepth < recipe.maxDepth,
					depthUsed: subgraph.metadata.depthUsed,
					nodesExplored: subgraph.metadata.nodesExplored,
					metrics: {
						nodesProcessed: subgraph.nodes.length,
						edgesProcessed: subgraph.edges.length,
						sliceDuration,
						brainwavOperationId: operationId,
					},
				},
			};
		} catch (error) {
			return this.createErrorResult(
				`brAInwav GraphRAG service error: ${error instanceof Error ? error.message : String(error)}`,
				operationId,
				startTime,
			);
		}
	}

	async validateRecipe(recipe: ContextSliceRecipe): Promise<ValidationResult> {
		const errors: string[] = [];

		try {
			const validated = ContextSliceRecipeSchema.parse(recipe);
			// Additional validation
			if (validated.query.trim().length === 0) {
				errors.push('Query cannot be empty');
			}
			if (validated.allowedEdgeTypes.length === 0) {
				errors.push('At least one edge type must be specified');
			}
		} catch (error) {
			if (error instanceof z.ZodError) {
				errors.push(...error.errors.map((e) => `${e.path.join('.')}: ${e.message}`));
			} else {
				errors.push('Invalid recipe format');
			}
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	private async buildSubgraph(
		graphRAGResult: GraphRAGResult,
		recipe: ContextSliceRecipe,
	): Promise<ContextSubgraph> {
		const nodes = graphRAGResult.sources.map((source, index) => ({
			id: `node-${index}`,
			type: source.nodeType,
			key: source.nodeKey,
			label: source.nodeKey,
			path: source.path,
			content: source.content,
			score: source.score,
			metadata: {
				lineStart: source.lineStart,
				lineEnd: source.lineEnd,
				brainwavIndexed: true,
				brainwavSource: 'graphrag',
			},
		}));

		// Create edges based on GraphRAG graph context
		const edges = this.buildEdgesFromGraphContext(graphRAGResult, nodes);

		return {
			nodes,
			edges,
			metadata: {
				focusNodes: graphRAGResult.graphContext.focusNodes,
				expandedNodes: graphRAGResult.graphContext.expandedNodes,
				totalChunks: graphRAGResult.graphContext.totalChunks,
				edgesTraversed: graphRAGResult.graphContext.edgesTraversed,
				depthUsed: recipe.maxDepth,
				nodesExplored: Math.min(nodes.length, recipe.maxNodes),
				sliceDuration: 0, // Will be set by caller
				brainwavGenerated: true,
				brainwavBranded: true,
			},
		};
	}

	private buildEdgesFromGraphContext(_graphRAGResult: GraphRAGResult, nodes: any[]): any[] {
		// Simple edge creation - in a real implementation, this would use
		// the actual graph structure from GraphRAG
		const edges = [];
		for (let i = 0; i < nodes.length - 1; i++) {
			edges.push({
				id: `edge-${i}`,
				from: nodes[i].id,
				to: nodes[i + 1].id,
				type: 'RELATED_TO',
				metadata: {
					brainwavGenerated: true,
					confidence: 0.8,
				},
			});
		}
		return edges;
	}

	private createSubgraphMetadata() {
		return {
			focusNodes: 0,
			expandedNodes: 0,
			totalChunks: 0,
			edgesTraversed: 0,
			depthUsed: 0,
			nodesExplored: 0,
			sliceDuration: 0,
			brainwavGenerated: true,
			brainwavBranded: true,
		};
	}

	private createErrorResult(
		error: string,
		operationId: string,
		startTime: number,
	): ContextSliceResult {
		return {
			subgraph: { nodes: [], edges: [], metadata: this.createSubgraphMetadata() },
			metadata: {
				sliceDuration: Date.now() - startTime,
				brainwavBranded: true,
				brainwavOperationId: operationId,
				error,
			},
		};
	}
}
