/**
 * @file asbr-ai-mcp-server.ts
 * @description ASBR AI Capabilities MCP Server - Exposes AI capabilities through MCP protocol
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 * @last_updated 2025-08-22
 * @maintainer @jamiescottcraik
 */

import {
	type AICoreCapabilities,
	createAICapabilities,
} from './ai-capabilities.js';
import {
	type ASBRAIIntegration,
	createASBRAIIntegration,
} from './asbr-ai-integration.js';

/**
 * MCP Tool Definition for ASBR AI Capabilities
 */
interface MCPTool {
	name: string;
	description: string;
	inputSchema: {
		type: 'object';
		properties: Record<string, any>;
		required: string[];
	};
}

/**
 * MCP Request/Response Types
 */
interface MCPToolCallRequest {
	method: 'tools/call';
	params: {
		name: string;
		arguments: Record<string, any>;
	};
}

interface MCPToolCallResponse {
	content: Array<{
		type: 'text';
		text: string;
	}>;
	isError?: boolean;
}

interface MCPListToolsResponse {
	tools: MCPTool[];
}

/**
 * ASBR AI Capabilities MCP Server
 * Provides AI capabilities (MLX, embeddings, RAG, evidence) as MCP tools
 */
export class ASBRAIMcpServer {
	private aiCapabilities: AICoreCapabilities;
	private asbrIntegration: ASBRAIIntegration;
	private isInitialized = false;

	constructor() {
		// Initialize AI capabilities with full configuration
		this.aiCapabilities = createAICapabilities('full');
		this.asbrIntegration = createASBRAIIntegration('balanced');
	}

	/**
	 * Initialize the MCP server
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) return;

		const capabilities = await this.aiCapabilities.getCapabilities();
		if (capabilities?.features) {
			console.log(
				`✅ ASBR AI MCP Server initialized with ${capabilities.features.length} features`,
			);
		} else {
			console.log(`⚠️ ASBR AI MCP Server initialized with limited capabilities`);
		}
		this.isInitialized = true;
	}

	/**
	 * Initializes the MCP server in "degraded mode" for testing purposes.
	 * In degraded mode, the server will start even if AI capabilities fail to load,
	 * but some or all AI features may be unavailable or non-functional. This allows
	 * tests to run without requiring full AI initialization.
	 *
	 * Usage: Only call this method in test environments where AI capabilities may be
	 * unavailable or intentionally disabled. Never use in production, as degraded mode
	 * may result in incomplete or unreliable server functionality.
	 *
	 * @internal
	 */
	async initializeForTesting(): Promise<void> {
		try {
			await this.initialize();
		} catch (error) {
			console.warn(
				`⚠️ ASBR AI MCP Server initialized in degraded test mode: ${error}`,
			);
			this.isInitialized = true;
		}
	}

	/**
	 * List available MCP tools
	 */
	async listTools(): Promise<MCPListToolsResponse> {
		const tools: MCPTool[] = [
			{
				name: 'ai_generate_text',
				description:
					'Generate text using MLX language models with optional system prompts and parameters',
				inputSchema: {
					type: 'object',
					properties: {
						prompt: {
							type: 'string',
							description: 'The text prompt to generate from',
						},
						systemPrompt: {
							type: 'string',
							description: 'Optional system prompt to guide the generation',
						},
						temperature: {
							type: 'number',
							description: 'Temperature for generation (0.0 to 1.0)',
							minimum: 0.0,
							maximum: 1.0,
						},
						maxTokens: {
							type: 'number',
							description: 'Maximum number of tokens to generate',
							minimum: 1,
							maximum: 4096,
						},
					},
					required: ['prompt'],
				},
			},
			{
				name: 'ai_search_knowledge',
				description:
					'Search through the knowledge base using semantic similarity',
				inputSchema: {
					type: 'object',
					properties: {
						query: {
							type: 'string',
							description: 'Search query to find relevant documents',
						},
						topK: {
							type: 'number',
							description: 'Number of top results to return',
							minimum: 1,
							maximum: 20,
						},
						minSimilarity: {
							type: 'number',
							description: 'Minimum similarity score (0.0 to 1.0)',
							minimum: 0.0,
							maximum: 1.0,
						},
					},
					required: ['query'],
				},
			},
			{
				name: 'ai_add_knowledge',
				description: 'Add documents to the knowledge base for semantic search',
				inputSchema: {
					type: 'object',
					properties: {
						documents: {
							type: 'array',
							items: {
								type: 'string',
							},
							description: 'Array of documents to add to the knowledge base',
						},
						metadata: {
							type: 'array',
							items: {
								type: 'object',
							},
							description: 'Optional metadata for each document',
						},
					},
					required: ['documents'],
				},
			},
			{
				name: 'ai_rag_query',
				description:
					'Perform Retrieval-Augmented Generation (RAG) query combining search and generation',
				inputSchema: {
					type: 'object',
					properties: {
						query: {
							type: 'string',
							description: 'Query to answer using RAG',
						},
						systemPrompt: {
							type: 'string',
							description: 'Optional system prompt for generation',
						},
					},
					required: ['query'],
				},
			},
			{
				name: 'ai_calculate_similarity',
				description: 'Calculate semantic similarity between two texts',
				inputSchema: {
					type: 'object',
					properties: {
						text1: {
							type: 'string',
							description: 'First text for comparison',
						},
						text2: {
							type: 'string',
							description: 'Second text for comparison',
						},
					},
					required: ['text1', 'text2'],
				},
			},
			{
				name: 'ai_get_embedding',
				description:
					'Generate embeddings for a given text using Qwen3-Embedding model',
				inputSchema: {
					type: 'object',
					properties: {
						text: {
							type: 'string',
							description: 'Text to generate embeddings for',
						},
					},
					required: ['text'],
				},
			},
			{
				name: 'asbr_collect_enhanced_evidence',
				description:
					'Collect and enhance evidence using AI analysis for ASBR integration',
				inputSchema: {
					type: 'object',
					properties: {
						taskId: {
							type: 'string',
							description: 'ASBR task identifier',
						},
						claim: {
							type: 'string',
							description: 'Evidence claim to analyze',
						},
						sources: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									type: {
										type: 'string',
										enum: ['file', 'url', 'repo', 'note'],
									},
									path: { type: 'string' },
									url: { type: 'string' },
									content: { type: 'string' },
								},
							},
							description: 'Evidence sources to analyze',
						},
						includeContent: {
							type: 'boolean',
							description: 'Whether to include source content in evidence',
						},
					},
					required: ['taskId', 'claim', 'sources'],
				},
			},
			{
				name: 'asbr_fact_check_evidence',
				description: 'Fact-check evidence using AI analysis',
				inputSchema: {
					type: 'object',
					properties: {
						evidenceId: {
							type: 'string',
							description: 'Evidence ID to fact-check',
						},
						claim: {
							type: 'string',
							description: 'Claim to fact-check',
						},
						taskId: {
							type: 'string',
							description: 'Associated task ID',
						},
					},
					required: ['evidenceId', 'claim', 'taskId'],
				},
			},
			{
				name: 'ai_get_capabilities',
				description:
					'Get information about available AI capabilities and system status',
				inputSchema: {
					type: 'object',
					properties: {},
					required: [],
				},
			},
			{
				name: 'ai_get_knowledge_stats',
				description: 'Get statistics about the current knowledge base',
				inputSchema: {
					type: 'object',
					properties: {},
					required: [],
				},
			},
		];

		return { tools };
	}

	/**
	 * Handle MCP tool calls
	 */
	async callTool(request: MCPToolCallRequest): Promise<MCPToolCallResponse> {
		try {
			const { name, arguments: args } = request.params;

			switch (name) {
				case 'ai_generate_text':
					return await this.handleGenerateText(args);

				case 'ai_search_knowledge':
					return await this.handleSearchKnowledge(args);

				case 'ai_add_knowledge':
					return await this.handleAddKnowledge(args);

				case 'ai_rag_query':
					return await this.handleRAGQuery(args);

				case 'ai_calculate_similarity':
					return await this.handleCalculateSimilarity(args);

				case 'ai_get_embedding':
					return await this.handleGetEmbedding(args);

				case 'asbr_collect_enhanced_evidence':
					return await this.handleCollectEnhancedEvidence(args);

				case 'asbr_fact_check_evidence':
					return await this.handleFactCheckEvidence(args);

				case 'ai_get_capabilities':
					return await this.handleGetCapabilities(args);

				case 'ai_get_knowledge_stats':
					return await this.handleGetKnowledgeStats(args);

				default:
					return {
						content: [{ type: 'text', text: `Unknown tool: ${name}` }],
						isError: true,
					};
			}
		} catch (error) {
			return {
				content: [{ type: 'text', text: `Tool error: ${error}` }],
				isError: true,
			};
		}
	}

	/**
	 * Tool handler implementations
	 */
	private async handleGenerateText(args: any): Promise<MCPToolCallResponse> {
		const result = await this.aiCapabilities.generate(args.prompt, {
			systemPrompt: args.systemPrompt,
			temperature: args.temperature,
			maxTokens: args.maxTokens,
		});

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							generated_text: result,
							prompt_length: args.prompt.length,
							model: 'MLX',
						},
						null,
						2,
					),
				},
			],
		};
	}

	private async handleSearchKnowledge(args: any): Promise<MCPToolCallResponse> {
		const results = await this.aiCapabilities.searchKnowledge(
			args.query,
			args.topK || 5,
			args.minSimilarity || 0.3,
		);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							query: args.query,
							results_count: results.length,
							results: results,
						},
						null,
						2,
					),
				},
			],
		};
	}

	private async handleAddKnowledge(args: any): Promise<MCPToolCallResponse> {
		const ids = await this.aiCapabilities.addKnowledge(
			args.documents,
			args.metadata,
		);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							added_documents: args.documents.length,
							document_ids: ids,
							status: 'success',
						},
						null,
						2,
					),
				},
			],
		};
	}

	private async handleRAGQuery(args: any): Promise<MCPToolCallResponse> {
		const result = await this.aiCapabilities.ragQuery({
			query: args.query,
			systemPrompt: args.systemPrompt,
		});

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							query: args.query,
							answer: result.answer,
							sources_count: result.sources.length,
							confidence: result.confidence,
							sources: result.sources.slice(0, 3), // Limit sources for readability
						},
						null,
						2,
					),
				},
			],
		};
	}

	private async handleCalculateSimilarity(
		args: any,
	): Promise<MCPToolCallResponse> {
		const similarity = await this.aiCapabilities.calculateSimilarity(
			args.text1,
			args.text2,
		);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							text1: `${args.text1.substring(0, 50)}...`,
							text2: `${args.text2.substring(0, 50)}...`,
							similarity: similarity,
							interpretation:
								(similarity || 0) > 0.8
									? 'very similar'
									: (similarity || 0) > 0.6
										? 'moderately similar'
										: (similarity || 0) > 0.3
											? 'somewhat similar'
											: 'not similar',
						},
						null,
						2,
					),
				},
			],
		};
	}

	private async handleGetEmbedding(args: any): Promise<MCPToolCallResponse> {
		const embedding = await this.aiCapabilities.getEmbedding(args.text);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							text: `${args.text.substring(0, 100)}...`,
							embedding_dimensions: embedding?.length || 0,
							model: 'Qwen3-Embedding-0.6B',
							embedding_preview: embedding?.slice(0, 5), // Show first 5 dimensions
						},
						null,
						2,
					),
				},
			],
		};
	}

	private async handleCollectEnhancedEvidence(
		args: any,
	): Promise<MCPToolCallResponse> {
		const context = {
			taskId: args.taskId,
			claim: args.claim,
			sources: args.sources,
		};

		const options = {
			includeContent: args.includeContent,
		};

		const result = await this.asbrIntegration.collectEnhancedEvidence(
			context,
			options,
		);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							task_id: args.taskId,
							claim: args.claim,
							original_evidence_id: result.originalEvidence.id,
							enhanced_evidence_id: result.aiEnhancedEvidence.id,
							additional_evidence_count: result.additionalEvidence.length,
							ai_processing_time: result.aiMetadata.processingTime,
							enhancement_methods: result.aiMetadata.enhancementMethods,
							insights: result.insights,
						},
						null,
						2,
					),
				},
			],
		};
	}

	private async handleFactCheckEvidence(
		args: any,
	): Promise<MCPToolCallResponse> {
		const evidence = {
			id: args.evidenceId,
			taskId: args.taskId,
			claim: args.claim,
			confidence: 0.8,
			riskLevel: 'medium' as const,
			source: { type: 'mcp-tool', id: 'fact-check' },
			timestamp: new Date().toISOString(),
			tags: ['mcp'],
			relatedEvidenceIds: [],
		};

		const result = await this.asbrIntegration.factCheckEvidence(evidence);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							evidence_id: args.evidenceId,
							claim: args.claim,
							factual_consistency: result.factualConsistency,
							potential_issues: result.potentialIssues,
							supporting_evidence_count: result.supportingEvidence.length,
							contradicting_evidence_count: result.contradictingEvidence.length,
						},
						null,
						2,
					),
				},
			],
		};
	}

	private async handleGetCapabilities(
		_args: any,
	): Promise<MCPToolCallResponse> {
		try {
			const capabilities = await this.aiCapabilities.getCapabilities();

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(
							{
								llm: capabilities?.llm || {
									provider: 'unavailable',
									model: 'unknown',
									healthy: false,
								},
								embedding: capabilities?.embedding,
								features: capabilities?.features || ['mcp-tools-only'],
								status: capabilities ? 'operational' : 'degraded',
								server_type: 'ASBR-AI-MCP-Server',
							},
							null,
							2,
						),
					},
				],
			};
		} catch (error) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(
							{
								llm: {
									provider: 'unavailable',
									model: 'unknown',
									healthy: false,
								},
								embedding: undefined,
								features: ['mcp-tools-only'],
								status: 'degraded',
								server_type: 'ASBR-AI-MCP-Server',
								error: `AI capabilities unavailable: ${error}`,
							},
							null,
							2,
						),
					},
				],
			};
		}
	}

	private async handleGetKnowledgeStats(
		_args: any,
	): Promise<MCPToolCallResponse> {
		const stats = this.aiCapabilities.getKnowledgeStats();

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							documents_stored: stats.documentsStored,
							embedding_stats: stats.embeddingStats,
							last_updated: new Date().toISOString(),
						},
						null,
						2,
					),
				},
			],
		};
	}

	/**
	 * Get server health information
	 */
	async getHealth(): Promise<{
		status: string;
		tools: number;
		features: string[];
	}> {
		try {
			const capabilities = await this.aiCapabilities.getCapabilities();
			const tools = await this.listTools();

			return {
				status: 'healthy',
				tools: tools.tools.length,
				features: capabilities?.features || ['degraded-mode'],
			};
		} catch (_error) {
			// Return degraded but operational status for testing scenarios
			const tools = await this.listTools();
			return {
				status: 'degraded',
				tools: tools.tools.length,
				features: ['mcp-tools-only'],
			};
		}
	}
}

/**
 * Create and export singleton instance
 */
export const asbrAIMcpServer = new ASBRAIMcpServer();

/**
 * Export factory function for custom configurations
 */
export function createASBRAIMcpServer(): ASBRAIMcpServer {
	return new ASBRAIMcpServer();
}
