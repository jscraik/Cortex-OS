/**
 * MCP AI Integration for cortex-webui
 *
 * Integrates MCP tools with AI features including RAG queries, multimodal support,
 * and context-aware tool recommendations for enhanced AI agent capabilities.
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { z } from 'zod';
import logger from '../utils/logger.js';
import type { McpToolExecutor } from './McpToolExecutor.js';
import { mcpToolRegistry } from './McpToolRegistry.js';

// AI integration types
export interface ToolRecommendation {
	toolId: string;
	toolName: string;
	description: string;
	relevanceScore: number;
	category: string;
	tags: string[];
	reason: string;
	usageCount: number;
}

export interface RAGQueryContext {
	query: string;
	userId?: string;
	sessionId?: string;
	contextType: 'search' | 'analysis' | 'creation' | 'comparison';
	relevantTools?: string[];
	excludedTools?: string[];
	maxRecommendations: number;
}

export interface MultimodalToolRequest {
	modality: 'text' | 'image' | 'audio' | 'video' | 'document';
	input: {
		text?: string;
		imageData?: string; // base64
		audioData?: string; // base64
		videoData?: string; // base64
		documentData?: string; // base64
		metadata?: Record<string, unknown>;
	};
	preferredTools?: string[];
	processingOptions?: {
		extractText?: boolean;
		generateDescription?: boolean;
		analyzeContent?: boolean;
	};
}

export interface MultimodalToolResult {
	success: boolean;
	modality: string;
	processedData: {
		text?: string;
		description?: string;
		analysis?: Record<string, unknown>;
		metadata?: Record<string, unknown>;
	};
	toolsUsed: Array<{
		toolId: string;
		toolName: string;
		result: unknown;
		executionTime: number;
	}>;
	confidence: number;
	timestamp: string;
}

// Schema definitions
const ragQueryContextSchema = z.object({
	query: z.string().min(1).max(1000),
	userId: z.string().optional(),
	sessionId: z.string().optional(),
	contextType: z.enum(['search', 'analysis', 'creation', 'comparison']).default('search'),
	relevantTools: z.array(z.string()).optional(),
	excludedTools: z.array(z.string()).optional(),
	maxRecommendations: z.number().int().min(1).max(20).default(10),
});

const multimodalToolRequestSchema = z.object({
	modality: z.enum(['text', 'image', 'audio', 'video', 'document']),
	input: z.object({
		text: z.string().optional(),
		imageData: z.string().optional(),
		audioData: z.string().optional(),
		videoData: z.string().optional(),
		documentData: z.string().optional(),
		metadata: z.record(z.unknown()).optional(),
	}),
	preferredTools: z.array(z.string()).optional(),
	processingOptions: z
		.object({
			extractText: z.boolean().default(false),
			generateDescription: z.boolean().default(false),
			analyzeContent: z.boolean().default(false),
		})
		.optional(),
});

export class McpAiIntegration extends EventEmitter {
	constructor(private toolExecutor: McpToolExecutor) {
		super();
	}

	/**
	 * Get context-aware tool recommendations for RAG queries
	 */
	public async getRAGToolRecommendations(context: RAGQueryContext): Promise<ToolRecommendation[]> {
		const validatedContext = ragQueryContextSchema.parse(context);
		const allTools = mcpToolRegistry.listTools();

		// Filter tools based on context
		const candidateTools = allTools.filter((tool) => {
			// Exclude specified tools
			if (validatedContext.excludedTools?.includes(tool.metadata.id)) {
				return false;
			}

			// Only include specified tools if provided
			if (validatedContext.relevantTools && validatedContext.relevantTools.length > 0) {
				return validatedContext.relevantTools.includes(tool.metadata.id);
			}

			// Only include active tools
			return tool.metadata.status === 'active';
		});

		// Calculate relevance scores
		const recommendations: ToolRecommendation[] = candidateTools.map((tool) => {
			let relevanceScore = 0;
			const reasons: string[] = [];

			// Keyword matching in tool name and description
			const queryLower = validatedContext.query.toLowerCase();
			const nameMatch = tool.metadata.name.toLowerCase().includes(queryLower);
			const descMatch = tool.metadata.description.toLowerCase().includes(queryLower);

			if (nameMatch) {
				relevanceScore += 0.4;
				reasons.push('Name matches query');
			}
			if (descMatch) {
				relevanceScore += 0.3;
				reasons.push('Description matches query');
			}

			// Tag matching
			const matchingTags = tool.metadata.tags.filter((tag) =>
				tag.toLowerCase().includes(queryLower),
			);
			if (matchingTags.length > 0) {
				relevanceScore += 0.2 * matchingTags.length;
				reasons.push(`Matching tags: ${matchingTags.join(', ')}`);
			}

			// Category relevance based on context type
			const categoryRelevance = this.getCategoryRelevance(
				tool.metadata.category,
				validatedContext.contextType,
			);
			relevanceScore += categoryRelevance.score;
			if (categoryRelevance.score > 0) {
				reasons.push(categoryRelevance.reason);
			}

			// Usage history (popular tools get bonus)
			const usageBonus = Math.min(tool.metadata.usageCount / 100, 0.2);
			relevanceScore += usageBonus;
			if (usageBonus > 0) {
				reasons.push('Frequently used tool');
			}

			// Recent usage bonus
			if (tool.metadata.lastUsed) {
				const daysSinceLastUse =
					(Date.now() - new Date(tool.metadata.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
				const recencyBonus = Math.max(0, 0.1 - daysSinceLastUse * 0.01);
				relevanceScore += recencyBonus;
				if (recencyBonus > 0) {
					reasons.push('Recently used');
				}
			}

			return {
				toolId: tool.metadata.id,
				toolName: tool.metadata.name,
				description: tool.metadata.description,
				relevanceScore: Math.min(relevanceScore, 1.0),
				category: tool.metadata.category,
				tags: tool.metadata.tags,
				reason: reasons.join('; '),
				usageCount: tool.metadata.usageCount,
			};
		});

		// Sort by relevance score and limit results
		const sortedRecommendations = recommendations
			.sort((a, b) => b.relevanceScore - a.relevanceScore)
			.slice(0, validatedContext.maxRecommendations);

		logger.info('brAInwav MCP AI: Generated RAG tool recommendations', {
			query: validatedContext.query,
			contextType: validatedContext.contextType,
			recommendationsCount: sortedRecommendations.length,
		});

		this.emit('ragRecommendationsGenerated', {
			context: validatedContext,
			recommendations: sortedRecommendations,
		});

		return sortedRecommendations;
	}

	/**
	 * Process multimodal content using appropriate MCP tools
	 */
	public async processMultimodalContent(
		request: MultimodalToolRequest,
	): Promise<MultimodalToolResult> {
		const validatedRequest = multimodalToolRequestSchema.parse(request);
		const startTime = Date.now();
		const correlationId = randomUUID();

		try {
			// Find relevant tools for this modality
			const relevantTools = await this.findMultimodalTools(
				validatedRequest.modality,
				validatedRequest.preferredTools,
			);

			if (relevantTools.length === 0) {
				throw new Error(`No tools available for ${validatedRequest.modality} modality`);
			}

			const toolsUsed: MultimodalToolResult['toolsUsed'] = [];
			let processedData: MultimodalToolResult['processedData'] = {};
			let overallConfidence = 0;

			// Process content through relevant tools
			for (const tool of relevantTools) {
				try {
					const toolParams = this.prepareToolParameters(validatedRequest, tool);

					const executionRequest = {
						toolId: tool.metadata.id,
						params: toolParams,
						context: {
							correlationId,
							timestamp: new Date().toISOString(),
							permissions: ['multimodal_processing'],
						},
					};

					const result = await this.toolExecutor.execute(executionRequest);

					if (result.success && result.data) {
						toolsUsed.push({
							toolId: tool.metadata.id,
							toolName: tool.metadata.name,
							result: result.data,
							executionTime: result.metadata.executionTime,
						});

						// Aggregate results
						processedData = this.aggregateResults(
							processedData,
							result.data,
							validatedRequest.modality,
						);
						overallConfidence = Math.max(overallConfidence, this.extractConfidence(result.data));
					}
				} catch (error) {
					logger.warn('brAInwav MCP AI: Multimodal tool execution failed', {
						toolId: tool.metadata.id,
						toolName: tool.metadata.name,
						error: error instanceof Error ? error.message : 'Unknown error',
					});
				}
			}

			const executionTime = Date.now() - startTime;

			const multimodalResult: MultimodalToolResult = {
				success: toolsUsed.length > 0,
				modality: validatedRequest.modality,
				processedData,
				toolsUsed,
				confidence: overallConfidence,
				timestamp: new Date().toISOString(),
			};

			logger.info('brAInwav MCP AI: Multimodal processing complete', {
				modality: validatedRequest.modality,
				toolsUsed: toolsUsed.length,
				executionTime,
				success: multimodalResult.success,
				correlationId,
			});

			this.emit('multimodalProcessed', {
				request: validatedRequest,
				result: multimodalResult,
				correlationId,
			});

			return multimodalResult;
		} catch (error) {
			const executionTime = Date.now() - startTime;

			logger.error('brAInwav MCP AI: Multimodal processing failed', {
				modality: validatedRequest.modality,
				error: error instanceof Error ? error.message : 'Unknown error',
				executionTime,
				correlationId,
			});

			return {
				success: false,
				modality: validatedRequest.modality,
				processedData: {},
				toolsUsed: [],
				confidence: 0,
				timestamp: new Date().toISOString(),
			};
		}
	}

	/**
	 * Get category relevance score based on context type
	 */
	private getCategoryRelevance(
		category: string,
		contextType: RAGQueryContext['contextType'],
	): { score: number; reason: string } {
		const categoryRelevanceMap: Record<
			string,
			Record<RAGQueryContext['contextType'], { score: number; reason: string }>
		> = {
			search: {
				search: { score: 0.3, reason: 'Search-related category' },
				analysis: { score: 0.1, reason: 'Can support analysis' },
				creation: { score: 0.0, reason: 'Not relevant for creation' },
				comparison: { score: 0.2, reason: 'Can support comparison' },
			},
			analysis: {
				search: { score: 0.2, reason: 'Analysis can support search' },
				analysis: { score: 0.4, reason: 'Analysis category match' },
				creation: { score: 0.1, reason: 'Analysis can inform creation' },
				comparison: { score: 0.3, reason: 'Analysis supports comparison' },
			},
			creation: {
				search: { score: 0.0, reason: 'Not relevant for search' },
				analysis: { score: 0.1, reason: 'Creation may require analysis' },
				creation: { score: 0.4, reason: 'Creation category match' },
				comparison: { score: 0.1, reason: 'Creation can support comparison' },
			},
			multimodal: {
				search: { score: 0.2, reason: 'Multimodal can enhance search' },
				analysis: { score: 0.3, reason: 'Multimodal supports analysis' },
				creation: { score: 0.3, reason: 'Multimodal enables creation' },
				comparison: { score: 0.2, reason: 'Multimodal supports comparison' },
			},
			communication: {
				search: { score: 0.1, reason: 'Communication tools can search messages' },
				analysis: { score: 0.2, reason: 'Communication data analysis' },
				creation: { score: 0.2, reason: 'Communication content creation' },
				comparison: { score: 0.1, reason: 'Limited comparison support' },
			},
		};

		return (
			categoryRelevanceMap[category]?.[contextType] || { score: 0, reason: 'No specific relevance' }
		);
	}

	/**
	 * Find tools suitable for multimodal processing
	 */
	private async findMultimodalTools(
		modality: string,
		preferredTools?: string[],
	): Promise<Array<McpToolRegistry['tools']['get']>> {
		const allTools = mcpToolRegistry.listTools();

		let candidateTools = allTools.filter((tool) => {
			// Only include active tools
			if (tool.metadata.status !== 'active') {
				return false;
			}

			// Check preferred tools first
			if (preferredTools && preferredTools.length > 0) {
				return preferredTools.includes(tool.metadata.id);
			}

			// Check for multimodal-related tags and categories
			const multimodalKeywords = [
				'multimodal',
				'image',
				'audio',
				'video',
				'document',
				'media',
				'vision',
				'speech',
				'text',
			];
			const hasMultimodalKeyword = multimodalKeywords.some(
				(keyword) =>
					tool.metadata.name.toLowerCase().includes(keyword) ||
					tool.metadata.description.toLowerCase().includes(keyword) ||
					tool.metadata.tags.some((tag) => tag.toLowerCase().includes(keyword)) ||
					tool.metadata.category.toLowerCase().includes(keyword),
			);

			return hasMultimodalKeyword;
		});

		// If no specific multimodal tools found, try general tools that might process content
		if (candidateTools.length === 0) {
			candidateTools = allTools.filter(
				(tool) =>
					tool.metadata.status === 'active' &&
					tool.metadata.category === 'analysis' &&
					tool.metadata.tags.some((tag) =>
						['content', 'data', 'processing'].includes(tag.toLowerCase()),
					),
			);
		}

		return candidateTools;
	}

	/**
	 * Prepare tool parameters for multimodal processing
	 */
	private prepareToolParameters(
		request: MultimodalToolRequest,
		tool: McpToolRegistry['tools']['get'],
	): Record<string, unknown> {
		const baseParams: Record<string, unknown> = {};

		// Add modality-specific input
		switch (request.modality) {
			case 'text':
				if (request.input.text) {
					baseParams.text = request.input.text;
				}
				break;
			case 'image':
				if (request.input.imageData) {
					baseParams.imageData = request.input.imageData;
				}
				break;
			case 'audio':
				if (request.input.audioData) {
					baseParams.audioData = request.input.audioData;
				}
				break;
			case 'video':
				if (request.input.videoData) {
					baseParams.videoData = request.input.videoData;
				}
				break;
			case 'document':
				if (request.input.documentData) {
					baseParams.documentData = request.input.documentData;
				}
				break;
		}

		// Add processing options
		if (request.processingOptions) {
			baseParams.options = request.processingOptions;
		}

		// Add metadata
		if (request.input.metadata) {
			baseParams.metadata = request.input.metadata;
		}

		return baseParams;
	}

	/**
	 * Aggregate results from multiple tool executions
	 */
	private aggregateResults(
		currentData: MultimodalToolResult['processedData'],
		newData: unknown,
		modality: string,
	): MultimodalToolResult['processedData'] {
		const result = { ...currentData };
		const dataAsRecord = newData as Record<string, unknown>;

		// Merge text extraction results
		if (dataAsRecord.text && typeof dataAsRecord.text === 'string') {
			result.text = result.text ? `${result.text}\n${dataAsRecord.text}` : dataAsRecord.text;
		}

		// Use the best description available
		if (dataAsRecord.description && typeof dataAsRecord.description === 'string') {
			result.description = dataAsRecord.description;
		}

		// Merge analysis results
		if (dataAsRecord.analysis && typeof dataAsRecord.analysis === 'object') {
			result.analysis = {
				...result.analysis,
				...dataAsRecord.analysis,
			};
		}

		// Merge metadata
		if (dataAsRecord.metadata && typeof dataAsRecord.metadata === 'object') {
			result.metadata = {
				...result.metadata,
				...dataAsRecord.metadata,
				modality,
				processedAt: new Date().toISOString(),
			};
		}

		return result;
	}

	/**
	 * Extract confidence score from tool result
	 */
	private extractConfidence(data: unknown): number {
		const dataAsRecord = data as Record<string, unknown>;

		// Look for explicit confidence scores
		if (typeof dataAsRecord.confidence === 'number') {
			return dataAsRecord.confidence;
		}

		// Look for quality or accuracy scores
		if (typeof dataAsRecord.quality === 'number') {
			return dataAsRecord.quality;
		}

		if (typeof dataAsRecord.accuracy === 'number') {
			return dataAsRecord.accuracy;
		}

		// Default confidence based on data presence
		const hasContent = !!(dataAsRecord.text || dataAsRecord.description || dataAsRecord.analysis);
		return hasContent ? 0.7 : 0.3;
	}

	/**
	 * Get AI integration statistics
	 */
	public getStats(): {
		totalRAGQueries: number;
		totalMultimodalProcesses: number;
		averageRecommendationsPerQuery: number;
		mostRecommendedCategories: Array<{ category: string; count: number }>;
		mostProcessedModalities: Array<{ modality: string; count: number }>;
	} {
		// This would be implemented with actual stats tracking
		// For now, return placeholder data
		return {
			totalRAGQueries: 0,
			totalMultimodalProcesses: 0,
			averageRecommendationsPerQuery: 0,
			mostRecommendedCategories: [],
			mostProcessedModalities: [],
		};
	}

	/**
	 * Create AI-optimized tool recommendations for specific use cases
	 */
	public async createAIWorkflowRecommendations(
		useCase: 'research' | 'content_creation' | 'data_analysis' | 'customer_support',
	): Promise<ToolRecommendation[]> {
		const useCaseContexts = {
			research: {
				query: 'research information analysis data gathering',
				contextType: 'search' as const,
				maxRecommendations: 15,
			},
			content_creation: {
				query: 'create content generate write compose',
				contextType: 'creation' as const,
				maxRecommendations: 12,
			},
			data_analysis: {
				query: 'analyze data process statistics insights',
				contextType: 'analysis' as const,
				maxRecommendations: 10,
			},
			customer_support: {
				query: 'customer support help assist communication',
				contextType: 'search' as const,
				maxRecommendations: 8,
			},
		};

		const context = useCaseContexts[useCase];
		return this.getRAGToolRecommendations(context);
	}
}
