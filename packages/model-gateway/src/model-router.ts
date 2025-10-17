/**
 * brAInwav Cortex-OS Hybrid Model Router
 * Implements MLX-first routing with Ollama Cloud conjunction strategy
 * Enforces hybrid integration for optimal performance and capability
 */

import { z } from 'zod';
import { FrontierAdapter, type FrontierAdapterApi } from './adapters/frontier-adapter.js';
import type { MCPAdapter } from './adapters/mcp-adapter.js';
import { MLXAdapter, type MLXAdapterApi } from './adapters/mlx-adapter.js';
import { OllamaAdapter, type OllamaAdapterApi } from './adapters/ollama-adapter.js';
// import {
//	createOrchestrationAdapter,
//	type OrchestrationAdapter,
// } from './adapters/orchestration-adapter.js';
import type { Message } from './adapters/types.js';

export type ModelCapability = 'embedding' | 'chat' | 'reranking' | 'vision';
export type ModelProvider = 'mlx' | 'ollama' | 'ollama-cloud' | 'frontier' | 'mcp';
export type HybridMode = 'privacy' | 'performance' | 'enterprise' | 'conjunction';

export interface ModelConfig {
	name: string;
	provider: ModelProvider;
	capabilities: ModelCapability[];
	priority: number;
	fallback?: string[];
	conjunction?: string[]; // Models to use in conjunction
	verification?: string; // Model for verification/comparison
	context_threshold?: number; // Context length threshold
	complexity_threshold?: 'simple' | 'moderate' | 'complex' | 'enterprise';
}

export interface HybridConfiguration {
	mode: HybridMode;
	parallel_verification: boolean;
	sequential_enhancement: boolean;
	specialized_delegation: boolean;
	consensus_voting: boolean;
}

const _EmbeddingRequestSchema = z.object({
	text: z.string(),
	model: z.string().optional(),
});
const EmbeddingBatchRequestSchema = z.object({
	texts: z.array(z.string()),
	model: z.string().optional(),
});
const ChatRequestSchema = z.object({
	messages: z.array(
		z.object({
			role: z.enum(['system', 'user', 'assistant']),
			content: z.string(),
		}),
	),
	model: z.string().optional(),
	max_tokens: z.number().optional(),
	temperature: z.number().optional(),
});
const RerankRequestSchema = z.object({
	query: z.string(),
	documents: z.array(z.string()),
	model: z.string().optional(),
});

export type EmbeddingRequest = z.infer<typeof _EmbeddingRequestSchema>;
export type EmbeddingBatchRequest = z.infer<typeof EmbeddingBatchRequestSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type RerankRequest = z.infer<typeof RerankRequestSchema>;

/** Interface exported for other modules/tests that consume the router */
export interface IModelRouter {
	initialize(): Promise<void>;
	generateEmbedding(
		request: EmbeddingRequest,
	): Promise<{ embedding: number[]; model: string; vector?: number[] }>;
	generateEmbeddings(
		request: z.infer<typeof EmbeddingBatchRequestSchema>,
	): Promise<{ embeddings: number[][]; model: string }>;
	generateChat(
		request: z.infer<typeof ChatRequestSchema>,
	): Promise<{ content: string; model: string }>;
	generateChatWithBands(
		request: z.infer<typeof ChatRequestSchema> & {
			triBandContext?: {
				bandA?: string;
				bandB?: number[];
				bandC?: Array<{
					type: string;
					value: string | number | boolean;
					context: string;
					confidence: number;
				}>;
				virtualTokenMode?: 'ignore' | 'decode' | 'pass-through';
				enableStructuredOutput?: boolean;
			};
		},
	): Promise<{ content: string; model: string; bandUsage?: any; virtualTokenMode?: string; structuredFactsProcessed?: boolean }>;
	rerank(
		request: z.infer<typeof RerankRequestSchema>,
	): Promise<{ documents: string[]; scores: number[]; model: string }>;
	getAvailableModels(capability: ModelCapability): ModelConfig[];
	hasAvailableModels(capability: ModelCapability): boolean;
	hasCapability(capability: ModelCapability): boolean;
	// Add method to check if privacy mode is enabled
	isPrivacyModeEnabled(): boolean;
	// Add method to enable/disable privacy mode
	setPrivacyMode(enabled: boolean): void;
	// Add hybrid mode support
	setHybridMode(mode: HybridMode): void;
	getHybridMode(): HybridMode;
	// Add conjunction methods
	generateWithConjunction(capability: ModelCapability, request: any): Promise<any>;
	generateWithVerification(capability: ModelCapability, request: any): Promise<any>;
}

export class ModelRouter implements IModelRouter {
	private readonly mlxAdapter: MLXAdapterApi;
	private readonly ollamaAdapter: OllamaAdapterApi;
	private readonly frontierAdapter: FrontierAdapterApi;
	private mcpAdapter: MCPAdapter | null = null;
	private mcpLoaded = false;
	private readonly availableModels: Map<ModelCapability, ModelConfig[]> = new Map();
	// Add privacy mode flag
	private privacyModeEnabled: boolean = false;
	// Add hybrid mode configuration
	private hybridMode: HybridMode = 'performance';
	private hybridConfig: HybridConfiguration = {
		mode: 'performance',
		parallel_verification: false,
		sequential_enhancement: true,
		specialized_delegation: true,
		consensus_voting: false,
	};
	// private readonly orchestrationAdapter: OrchestrationAdapter;

	constructor(
		mlxAdapter: MLXAdapterApi = new MLXAdapter(),
		ollamaAdapter: OllamaAdapterApi = new OllamaAdapter(),
		frontierAdapter: FrontierAdapterApi = new FrontierAdapter(),
	) {
		this.mlxAdapter = mlxAdapter;
		this.ollamaAdapter = ollamaAdapter;
		this.frontierAdapter = frontierAdapter;
		// this.orchestrationAdapter = createOrchestrationAdapter();

		// Check for privacy mode environment variable
		if (process.env.CORTEX_PRIVACY_MODE === 'true') {
			this.privacyModeEnabled = true;
			// this.orchestrationAdapter.setPrivacyMode(true);
		}
	}

	async initialize(): Promise<void> {
		const mlxAvailable = await this.mlxAdapter.isAvailable();
		const ollamaAvailable = await this.ollamaAdapter.isAvailable();
		const mcpAvailable = await this.ensureMcpLoaded();
		const frontierAvailable = await this.frontierAdapter.isAvailable();

		// Initialize orchestration models first
		// const orchestrationModels = this.orchestrationAdapter.getAllModels();
		const orchestrationModels: ModelConfig[] = []; // Temporary placeholder
		console.log(`brAInwav Cortex-OS: Loaded ${orchestrationModels.length} orchestration models`);

		// Merge orchestration models with adapter-based models
		this.availableModels.set('embedding', [
			...orchestrationModels.filter((m) => m.capabilities.includes('embedding')),
			...this.buildEmbeddingModels(mlxAvailable, ollamaAvailable, mcpAvailable, frontierAvailable),
		]);
		this.availableModels.set('chat', [
			...orchestrationModels.filter((m) => m.capabilities.includes('chat')),
			...(await this.buildChatModels(ollamaAvailable, mcpAvailable, frontierAvailable)),
		]);
		this.availableModels.set('reranking', [
			...orchestrationModels.filter((m) => m.capabilities.includes('reranking')),
			...this.buildRerankingModels(mlxAvailable, ollamaAvailable, mcpAvailable, frontierAvailable),
		]);

		// Add vision models from orchestration
		const visionModels = orchestrationModels.filter((m) => m.capabilities.includes('vision'));
		if (visionModels.length > 0) {
			this.availableModels.set('vision', visionModels);
		}

		console.log('brAInwav Cortex-OS: Model Gateway initialized with orchestration integration');
	}

	// Try to lazy-load MCP adapter; return boolean available
	private async ensureMcpLoaded(): Promise<boolean> {
		if (this.mcpLoaded) return !!this.mcpAdapter;
		try {
			const mod = await import('./adapters/mcp-adapter');
			// createMCPAdapter returns a synchronous adapter object
			this.mcpAdapter = mod.createMCPAdapter();
			this.mcpLoaded = true;
			return true;
		} catch {
			this.mcpLoaded = false;
			return false;
		}
	}

	private buildEmbeddingModels(
		mlxAvailable: boolean,
		ollamaAvailable: boolean,
		mcpAvailable: boolean,
		frontierAvailable: boolean,
	): ModelConfig[] {
		const embeddingModels: ModelConfig[] = [];
		if (mlxAvailable) {
			const ollamaFallback = ollamaAvailable ? ['nomic-embed-text'] : [];
			embeddingModels.push(
				{
					name: 'qwen3-embedding-4b-mlx',
					provider: 'mlx',
					capabilities: ['embedding'],
					priority: 100,
					fallback: this.privacyModeEnabled ? [] : ['qwen3-embedding-8b-mlx', ...ollamaFallback],
					verification: this.privacyModeEnabled ? undefined : 'nomic-embed-text',
					conjunction: this.privacyModeEnabled ? [] : ['nomic-embed-text', 'granite-embedding'],
				},
				{
					name: 'qwen3-embedding-8b-mlx',
					provider: 'mlx',
					capabilities: ['embedding'],
					priority: 95,
					fallback: this.privacyModeEnabled ? [] : ['qwen3-embedding-4b-mlx', ...ollamaFallback],
					verification: this.privacyModeEnabled ? undefined : 'nomic-embed-text',
				},
			);
		}

		// Only include non-MLX providers if privacy mode is disabled
		if (!this.privacyModeEnabled) {
			if (ollamaAvailable) {
				embeddingModels.push(
					{
						name: 'nomic-embed-text',
						provider: 'ollama',
						capabilities: ['embedding'],
						priority: mlxAvailable ? 80 : 100,
						fallback: [],
						conjunction: ['granite-embedding'],
					},
					{
						name: 'granite-embedding',
						provider: 'ollama',
						capabilities: ['embedding'],
						priority: mlxAvailable ? 75 : 95,
						fallback: [],
					},
				);
			}
			if (!mlxAvailable && !ollamaAvailable && mcpAvailable) {
				embeddingModels.push({
					name: 'mcp-embeddings',
					provider: 'mcp',
					capabilities: ['embedding'],
					priority: 80,
					fallback: [],
				});
			}
			if (!mlxAvailable && !ollamaAvailable && !mcpAvailable && frontierAvailable) {
				embeddingModels.push({
					name: 'frontier-embedding',
					provider: 'frontier',
					capabilities: ['embedding'],
					priority: 70,
					fallback: [],
				});
			}
		}
		return embeddingModels;
	}

	private async buildChatModels(
		ollamaAvailable: boolean,
		mcpAvailable: boolean,
		frontierAvailable: boolean,
	): Promise<ModelConfig[]> {
		const chatModels: ModelConfig[] = [];
		if (ollamaAvailable) {
			const ollamaModels = await this.ollamaAdapter.listModels().catch(() => []);
			const desiredChat = [
				{
					name: 'gpt-oss:20b',
					priority: 100,
					fallback: [] as string[],
					conjunction: ['qwen3-coder:30b'],
				},
				{
					name: 'qwen3-coder:30b',
					priority: 95,
					fallback: [] as string[],
					verification: 'deepseek-coder:6.7b',
				},
				{
					name: 'deepseek-coder:6.7b',
					priority: 90,
					fallback: [] as string[],
					conjunction: ['phi4-mini-reasoning'],
				},
				{ name: 'phi4-mini-reasoning', priority: 85, fallback: [] as string[] },
				{ name: 'gemma3n:e4b', priority: 80, fallback: [] as string[] },
				{ name: 'llama2', priority: 70, fallback: [] as string[] },
			];

			// Add cloud models for specialized delegation
			if (!this.privacyModeEnabled) {
                                const cloudModels = [
                                        {
                                                name: 'qwen3-coder:480b-cloud',
                                                priority: 105, // Higher than local for enterprise tasks
                                                fallback: ['qwen3-coder:30b'],
                                                context_threshold: 100000,
                                                complexity_threshold: 'enterprise' as const,
                                        },
                                        {
                                                name: 'glm-4.6:cloud',
                                                priority: 103,
                                                fallback: ['glm-4.5'],
                                                context_threshold: 60000,
                                                complexity_threshold: 'complex' as const,
                                                // General reasoning / documentation synthesis tier
                                        },
                                        {
                                                name: 'gpt-oss:120b-cloud',
                                                priority: 102,
                                                fallback: ['gpt-oss:20b'],
                                                context_threshold: 80000,
						complexity_threshold: 'complex' as const,
					},
					{
						name: 'deepseek-v3.1:671b-cloud',
						priority: 103,
						fallback: ['deepseek-coder:6.7b'],
						context_threshold: 150000,
						complexity_threshold: 'enterprise' as const,
					},
				];

				for (const cloudModel of cloudModels) {
                                        chatModels.push({
                                                name: cloudModel.name,
                                                provider: 'ollama-cloud',
                                                capabilities: ['chat'],
                                                priority: cloudModel.priority,
                                                fallback: cloudModel.fallback,
                                                context_threshold: cloudModel.context_threshold,
                                                complexity_threshold: cloudModel.complexity_threshold,
                                        });
                                }
			}

			// Only include MCP if privacy mode is disabled
			if (mcpAvailable && !this.privacyModeEnabled) {
				chatModels.push({
					name: 'mcp-chat',
					provider: 'mcp',
					capabilities: ['chat'],
					priority: 60,
					fallback: [],
				});
			}

			for (const m of desiredChat) {
				if (ollamaModels.some((name) => name === m.name || name.startsWith(m.name))) {
					// Only add MCP fallback if privacy mode is disabled
					if (mcpAvailable && !this.privacyModeEnabled) m.fallback = ['mcp-chat'];
					chatModels.push({
						name: m.name,
						provider: 'ollama',
						capabilities: ['chat'],
						priority: m.priority,
						fallback: m.fallback,
						conjunction: (m as any).conjunction,
						verification: (m as any).verification,
					});
				} else {
					console.warn(`[brAInwav Cortex-OS] Ollama model ${m.name} not installed; skipping`);
				}
			}
		}

		// Only include non-local providers if privacy mode is disabled
		if (!this.privacyModeEnabled) {
			if (!ollamaAvailable && mcpAvailable) {
				chatModels.push({
					name: 'mcp-chat',
					provider: 'mcp',
					capabilities: ['chat'],
					priority: 70,
					fallback: [],
				});
			}
			if (!ollamaAvailable && !mcpAvailable && frontierAvailable) {
				chatModels.push({
					name: 'frontier-chat',
					provider: 'frontier',
					capabilities: ['chat'],
					priority: 50,
					fallback: [],
				});
			}
		}
		return chatModels;
	}

	private buildRerankingModels(
		mlxAvailable: boolean,
		ollamaAvailable: boolean,
		mcpAvailable: boolean,
		frontierAvailable: boolean,
	): ModelConfig[] {
		const rerankingModels: ModelConfig[] = [];
		if (mlxAvailable) {
			rerankingModels.push({
				name: 'qwen3-reranker-4b-mlx',
				provider: 'mlx',
				capabilities: ['reranking'],
				priority: 100,
				fallback: this.privacyModeEnabled ? [] : ollamaAvailable ? ['nomic-embed-text'] : [],
			});
		}

		// Only include non-MLX providers if privacy mode is disabled
		if (!this.privacyModeEnabled) {
			if (ollamaAvailable) {
				rerankingModels.push({
					name: 'nomic-embed-text',
					provider: 'ollama',
					capabilities: ['reranking'],
					priority: mlxAvailable ? 80 : 100,
					fallback: [],
				});
			}
			if (!mlxAvailable && !ollamaAvailable && mcpAvailable) {
				rerankingModels.push({
					name: 'mcp-rerank',
					provider: 'mcp',
					capabilities: ['reranking'],
					priority: 60,
					fallback: [],
				});
			}
			if (!mlxAvailable && !ollamaAvailable && !mcpAvailable && frontierAvailable) {
				rerankingModels.push({
					name: 'frontier-rerank',
					provider: 'frontier',
					capabilities: ['reranking'],
					priority: 50,
					fallback: [],
				});
			}
		}
		return rerankingModels;
	}

	private selectModel(
		capability: ModelCapability,
		requestedModel?: string,
		contextLength?: number,
		complexity?: string,
	): ModelConfig | null {
		const models = this.availableModels.get(capability);
		if (!models || models.length === 0) return null;

		// If a specific model is requested, try to find it
		if (requestedModel) {
			const requested = models.find((m) => m.name === requestedModel);
			if (requested) return requested;
		}

		// Filter models based on privacy mode
		const filteredModels = this.privacyModeEnabled
			? models.filter((m) => m.provider === 'mlx')
			: models;

		if (filteredModels.length === 0) return null;

		// Hybrid routing logic based on context and complexity
		if (!this.privacyModeEnabled && this.hybridMode === 'enterprise') {
			// For massive context, prefer cloud models
			if (contextLength && contextLength > 100000) {
				const cloudModel = filteredModels.find(
					(m) => m.provider === 'ollama-cloud' && (m.context_threshold || 0) <= contextLength,
				);
				if (cloudModel) {
					console.log(
						`brAInwav Cortex-OS: Selected cloud model ${cloudModel.name} for large context (${contextLength})`,
					);
					return cloudModel;
				}
			}

			// For enterprise complexity, prefer cloud models
			if (complexity === 'enterprise') {
				const enterpriseModel = filteredModels.find(
					(m) => m.provider === 'ollama-cloud' && m.complexity_threshold === 'enterprise',
				);
				if (enterpriseModel) {
					console.log(
						`brAInwav Cortex-OS: Selected enterprise cloud model ${enterpriseModel.name}`,
					);
					return enterpriseModel;
				}
			}
		}

		// Default selection by priority (MLX-first principle)
		return [...filteredModels].sort((a, b) => {
			// Always prioritize MLX models first
			if (a.provider === 'mlx' && b.provider !== 'mlx') return -1;
			if (b.provider === 'mlx' && a.provider !== 'mlx') return 1;
			// Then sort by priority
			return b.priority - a.priority;
		})[0];
	}

	hasCapability(capability: ModelCapability): boolean {
		const models = this.availableModels.get(capability);
		if (!models || models.length === 0) return false;

		// In privacy mode, check if there are any MLX models available
		if (this.privacyModeEnabled) {
			return models.some((m) => m.provider === 'mlx');
		}

		return true;
	}

	async generateEmbedding(
		request: EmbeddingRequest,
	): Promise<{ embedding: number[]; model: string }> {
		const model = this.selectModel('embedding', request.model);
		if (!model) throw new Error('No embedding models available');

		const tryModel = async (m: ModelConfig): Promise<{ embedding: number[]; model: string }> => {
			if (m.provider === 'mlx') {
				const response = await this.mlxAdapter.generateEmbedding({
					text: request.text,
					model: m.name,
				});
				return { embedding: response.embedding, model: m.name, vector: response.embedding };
			} else if (m.provider === 'ollama') {
				const response = await this.ollamaAdapter.generateEmbedding(request.text, m.name);
				return { embedding: response.embedding, model: m.name, vector: response.embedding };
			} else if (m.provider === 'frontier') {
				const response = await this.frontierAdapter.generateEmbedding(request.text, m.name);
				return { embedding: response.embedding, model: m.name, vector: response.embedding };
			} else {
				if (!this.mcpAdapter) throw new Error('MCP adapter not loaded');
				const response = await this.mcpAdapter.generateEmbedding(request);
				return { embedding: response.embedding, model: response.model };
			}
		};

		try {
			return await tryModel(model);
		} catch (error) {
			console.warn(`Primary embedding model ${model.name} failed, attempting fallback:`, error);
			for (const fallbackName of model.fallback || []) {
				const fallbackModel = this.availableModels
					.get('embedding')
					?.find((m) => m.name === fallbackName);
				if (!fallbackModel) continue;
				try {
					return await tryModel(fallbackModel);
				} catch (fallbackError) {
					console.warn(`Fallback embedding model ${fallbackName} also failed:`, fallbackError);
				}
			}
			throw new Error(
				`All embedding models failed. Last error: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
			);
		}
	}

	async generateEmbeddings(
		request: EmbeddingBatchRequest,
	): Promise<{ embeddings: number[][]; model: string }> {
		const model = this.selectModel('embedding', request.model);
		if (!model) throw new Error('No embedding models available');

		const tryModel = async (m: ModelConfig): Promise<{ embeddings: number[][]; model: string }> => {
			if (m.provider === 'mlx') {
				const responses = await this.mlxAdapter.generateEmbeddings(request.texts, m.name);
				return { embeddings: responses.map((r) => r.embedding), model: m.name };
			} else if (m.provider === 'ollama') {
				const responses = await this.ollamaAdapter.generateEmbeddings(request.texts, m.name);
				return { embeddings: responses.map((r) => r.embedding), model: m.name };
			} else if (m.provider === 'frontier') {
				const responses = await this.frontierAdapter.generateEmbeddings(request.texts, m.name);
				return { embeddings: responses.map((r) => r.embedding), model: m.name };
			} else {
				if (!this.mcpAdapter) throw new Error('MCP adapter not loaded');
				const res = await this.mcpAdapter.generateEmbeddings(request);
				return { embeddings: res.embeddings, model: res.model };
			}
		};

		try {
			return await tryModel(model);
		} catch (error) {
			console.warn(
				`Primary batch embedding model ${model.name} failed, attempting fallback:`,
				error,
			);
			for (const fallbackName of model.fallback || []) {
				const fallbackModel = this.availableModels
					.get('embedding')
					?.find((m) => m.name === fallbackName);
				if (!fallbackModel) continue;
				try {
					return await tryModel(fallbackModel);
				} catch (fallbackError) {
					console.warn(
						`Fallback batch embedding model ${fallbackName} also failed:`,
						fallbackError,
					);
				}
			}
			throw new Error(
				`All batch embedding models failed. Last error: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
			);
		}
	}

	async generateChat(request: ChatRequest): Promise<{ content: string; model: string }> {
		const model = this.selectModel('chat', request.model);
		if (!model) throw new Error('No chat models available');

		const tryModel = async (m: ModelConfig): Promise<{ content: string; model: string }> => {
			if (m.provider === 'ollama') {
				const response = await this.ollamaAdapter.generateChat({
					messages: request.messages as unknown as Message[],
					model: m.name,
					max_tokens: request.max_tokens,
					temperature: request.temperature,
				});
				return { content: response.content, model: m.name };
			} else if (m.provider === 'frontier') {
				const response = await this.frontierAdapter.generateChat({
					messages: request.messages as unknown as Message[],
					model: m.name,
					max_tokens: request.max_tokens,
					temperature: request.temperature,
				});
				return { content: response.content, model: m.name };
			} else if (m.provider === 'mcp') {
				// Lazy load MCP to avoid hard dependency for tests
				const response = await (await import('./adapters/mcp-adapter'))
					.createMCPAdapter()
					.generateChat(request);
				return { content: response.content, model: response.model };
			} else {
				throw new Error('MLX chat not routed via gateway');
			}
		};

		try {
			return await tryModel(model);
		} catch (error) {
			console.warn(`Primary chat model ${model.name} failed, attempting fallback:`, error);
			for (const fallbackName of model.fallback || []) {
				const fallbackModel = this.availableModels
					.get('chat')
					?.find((m) => m.name === fallbackName);
				if (!fallbackModel) continue;
				try {
					return await tryModel(fallbackModel);
				} catch (fallbackError) {
					console.warn(`Fallback chat model ${fallbackName} also failed:`, fallbackError);
				}
			}
			throw new Error(
				`All chat models failed. Last error: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
			);
		}
	}

	async rerank(
		request: RerankRequest,
	): Promise<{ documents: string[]; scores: number[]; model: string }> {
		const model = this.selectModel('reranking', request.model);
		if (!model) throw new Error('No reranking models available');

		const tryModel = async (
			m: ModelConfig,
		): Promise<{ documents: string[]; scores: number[]; model: string }> => {
			if (m.provider === 'mlx') {
				const response = await this.mlxAdapter.rerank(request.query, request.documents, m.name);
				return {
					documents: request.documents,
					scores: response.scores,
					model: m.name,
				};
			} else if (m.provider === 'ollama') {
				const response = await this.ollamaAdapter.rerank(request.query, request.documents, m.name);
				return {
					documents: request.documents,
					scores: response.scores,
					model: m.name,
				};
			} else if (m.provider === 'frontier') {
				const response = await this.frontierAdapter.rerank(
					request.query,
					request.documents,
					m.name,
				);
				return {
					documents: request.documents,
					scores: response.scores,
					model: m.name,
				};
			} else {
				const response = await this.ollamaAdapter.rerank(request.query, request.documents, m.name);
				return {
					documents: request.documents,
					scores: response.scores,
					model: m.name,
				};
			}
		};

		try {
			return await tryModel(model);
		} catch (error) {
			console.warn(`Primary reranking model ${model.name} failed, attempting fallback:`, error);
			for (const fallbackName of model.fallback || []) {
				const fallbackModel = this.availableModels
					.get('reranking')
					?.find((m) => m.name === fallbackName);
				if (!fallbackModel) continue;
				try {
					return await tryModel(fallbackModel);
				} catch (fallbackError) {
					console.warn(`Fallback reranking model ${fallbackName} also failed:`, fallbackError);
				}
			}
			throw new Error(
				`All reranking models failed. Last error: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
			);
		}
	}

	getAvailableModels(capability: ModelCapability): ModelConfig[] {
		return this.availableModels.get(capability) || [];
	}

	hasAvailableModels(capability: ModelCapability): boolean {
		const models = this.availableModels.get(capability);
		return !!models && models.length > 0;
	}

	/**
	 * Get orchestration health status
	 */
	getOrchestrationHealth() {
		// return this.orchestrationAdapter.getHealthStatus();
		return { status: 'ok', orchestration: 'disabled' }; // Temporary
	}

	// Add hybrid mode methods
	setHybridMode(mode: HybridMode): void {
		this.hybridMode = mode;
		console.log(`brAInwav Cortex-OS: Hybrid mode set to ${mode}`);
	}

	getHybridMode(): HybridMode {
		return this.hybridMode;
	}

	// Add conjunction methods
	async generateWithConjunction(capability: ModelCapability, request: any): Promise<any> {
		const primary = this.selectModel(capability, request.model);
		if (!primary) throw new Error(`No ${capability} models available`);

		if (primary.conjunction && this.hybridConfig.parallel_verification) {
			// Run both models in parallel for verification
			const conjunctionModel = this.availableModels
				.get(capability)
				?.find((m) => primary.conjunction?.includes(m.name));
			if (conjunctionModel) {
				try {
					const [primaryResult, conjunctionResult] = await Promise.all([
						this.executeModelRequest(primary, capability, request),
						this.executeModelRequest(conjunctionModel, capability, request),
					]);
					return {
						primary: primaryResult,
						verification: conjunctionResult,
						consensus: this.calculateConsensus(primaryResult, conjunctionResult),
						model: `${primary.name}+${conjunctionModel.name}`,
					};
				} catch (error) {
					console.warn(
						'brAInwav Cortex-OS: Conjunction verification failed, using primary only:',
						error,
					);
				}
			}
		}

		// Fallback to single model
		return await this.executeModelRequest(primary, capability, request);
	}

	async generateWithVerification(capability: ModelCapability, request: any): Promise<any> {
		const primary = this.selectModel(capability, request.model);
		if (!primary) throw new Error(`No ${capability} models available`);

		const result = await this.executeModelRequest(primary, capability, request);

		if (primary.verification && this.hybridConfig.parallel_verification) {
			const verificationModel = this.availableModels
				.get(capability)
				?.find((m) => m.name === primary.verification);
			if (verificationModel) {
				try {
					const verificationResult = await this.executeModelRequest(
						verificationModel,
						capability,
						request,
					);
					return {
						...result,
						verification: verificationResult,
						verified: true,
					};
				} catch (error) {
					console.warn('brAInwav Cortex-OS: Verification failed:', error);
				}
			}
		}

		return result;
	}

	private async executeModelRequest(
		_model: ModelConfig,
		capability: ModelCapability,
		request: any,
	): Promise<any> {
		switch (capability) {
			case 'embedding':
				return await this.generateEmbedding(request);
			case 'chat':
				return await this.generateChat(request);
			case 'reranking':
				return await this.rerank(request);
			default:
				throw new Error(`Unsupported capability: ${capability}`);
		}
	}

	private calculateConsensus(primary: any, verification: any): any {
		// Simple consensus calculation - can be enhanced based on specific needs
		return {
			agreement: JSON.stringify(primary) === JSON.stringify(verification),
			confidence: 0.85, // Placeholder confidence score
			primary_model: primary.model,
			verification_model: verification.model,
		};
	}

	/**
	 * Generate chat with REF‑RAG tri-band context support
	 */
	async generateChatWithBands(
		request: z.infer<typeof ChatRequestSchema> & {
			triBandContext?: {
				bandA?: string;
				bandB?: number[];
				bandC?: Array<{
					type: string;
					value: string | number | boolean;
					context: string;
					confidence: number;
				}>;
				virtualTokenMode?: 'ignore' | 'decode' | 'pass-through';
				enableStructuredOutput?: boolean;
			};
		},
	): Promise<{ content: string; model: string; bandUsage?: any; virtualTokenMode?: string; structuredFactsProcessed?: boolean }> {
		const model = this.selectModel('chat', request.model);
		if (!model) throw new Error('No chat models available');

		// If no tri-band context, use standard chat
		if (!request.triBandContext) {
			return await this.generateChat(request);
		}

		const { triBandContext } = request;

		// Prefer MLX for tri-band context processing
		if (model.provider === 'mlx') {
			try {
				// Use MLX adapter's tri-band support
				const response = await this.mlxAdapter.generateChatWithBands({
					messages: request.messages as unknown as Message[],
					model: model.name,
					bandA: triBandContext.bandA,
					bandB: triBandContext.bandB,
					bandC: triBandContext.bandC,
					virtualTokenMode: triBandContext.virtualTokenMode || 'pass-through',
					enableStructuredOutput: triBandContext.enableStructuredOutput || false,
					max_tokens: request.max_tokens,
					temperature: request.temperature,
				});

				return {
					content: response.content,
					model: model.name,
					bandUsage: response.bandUsage,
					virtualTokenMode: response.virtualTokenMode,
					structuredFactsProcessed: response.structuredFactsProcessed,
				};
			} catch (error) {
				console.warn('MLX tri-band chat failed, falling back to standard chat:', error);
				// Fallback to standard chat
				return await this.generateChat({
					messages: request.messages,
					model: request.model,
					max_tokens: request.max_tokens,
					temperature: request.temperature,
				});
			}
		} else {
			// For non-MLX models, embed tri-band context in messages
			const enhancedMessages = this.enhanceMessagesWithTriBand(
				request.messages,
				triBandContext,
			);

			return await this.generateChat({
				messages: enhancedMessages,
				model: request.model,
				max_tokens: request.max_tokens,
				temperature: request.temperature,
			});
		}
	}

	/**
	 * Enhance chat messages with tri-band context for non-MLX models
	 */
	private enhanceMessagesWithTriBand(
		messages: z.infer<typeof ChatRequestSchema>['messages'],
		triBandContext: any,
	): z.infer<typeof ChatRequestSchema>['messages'] {
		const enhancedMessages = [...messages];

		// Find the last user message to augment with tri-band context
		const lastUserIndex = enhancedMessages
			.map((m, idx) => (m.role === 'user' ? idx : -1))
			.filter(idx => idx >= 0)
			.pop();

		if (lastUserIndex >= 0) {
			const lastUserMessage = enhancedMessages[lastUserIndex];
			let enhancedContent = lastUserMessage.content;

			// Add Band A context
			if (triBandContext.bandA) {
				enhancedContent += `\n\nContext:\n${triBandContext.bandA}`;
			}

			// Add Band C facts
			if (triBandContext.bandC && triBandContext.bandC.length > 0) {
				enhancedContent += '\n\nKey Facts:\n';
				triBandContext.bandC.forEach(fact => {
					const confidenceStr = fact.confidence < 0.8 ? ` (${Math.round(fact.confidence * 100)}% confidence)` : '';
					enhancedContent += `- ${fact.type}: ${fact.value}${confidenceStr}\n`;
				});
			}

			// Add instructions
			enhancedContent += '\n\nPlease use the provided context and facts to provide a comprehensive answer.';

			enhancedMessages[lastUserIndex] = {
				...lastUserMessage,
				content: enhancedContent,
			};
		}

		return enhancedMessages;
	}

	// Add privacy mode methods
	isPrivacyModeEnabled(): boolean {
		return this.privacyModeEnabled;
	}

	setPrivacyMode(enabled: boolean): void {
		this.privacyModeEnabled = enabled;
		console.log(`brAInwav Cortex-OS: Privacy mode ${enabled ? 'enabled' : 'disabled'}`);
	}
}

/** Factory to create a model router using default adapters */
export function createModelRouter(
	mlxAdapter: MLXAdapterApi = new MLXAdapter(),
	ollamaAdapter: OllamaAdapterApi = new OllamaAdapter(),
	frontierAdapter: FrontierAdapterApi = new FrontierAdapter(),
): IModelRouter {
	return new ModelRouter(mlxAdapter, ollamaAdapter, frontierAdapter);
}
