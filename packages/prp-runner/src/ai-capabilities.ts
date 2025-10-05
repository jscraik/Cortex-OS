/**
 * @file ai-capabilities.ts
 * @description Unified AI Capabilities Interface - Combines LLM, Embeddings, and Reranking
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import {
	capturePromptUsage,
	getPrompt,
	getSafePrompt,
	renderPrompt,
	validatePromptUsage,
} from '@cortex-os/prompts';
import {
	createEmbeddingAdapter,
	createRerankerAdapter,
	type EmbeddingAdapter,
	type RerankerAdapter,
} from './embedding-adapter.js';
import {
	checkProviderHealth,
	configureLLM,
	getModel,
	getProvider,
	type LLMState,
	generate as llmGenerate,
	shutdown as shutdownLLM,
} from './llm-bridge.js';
import { AVAILABLE_MLX_MODELS } from './mlx-adapter.js';

export interface AICoreConfig {
	// LLM Configuration
	llm: {
		provider: 'mlx' | 'ollama';
		model?: string;
		endpoint?: string;
		mlxModel?: string;
		temperature?: number;
		maxTokens?: number;
	};

	// Embedding Configuration
	embedding?: {
		provider: 'sentence-transformers' | 'local';
		model?: string;
		dimensions?: number;
	};

	// Reranker Configuration
	reranker?: {
		provider: 'transformers' | 'local';
		model?: string;
	};

	// RAG Configuration
	rag?: {
		topK?: number;
		similarityThreshold?: number;
		rerankTopK?: number;
		includeContext?: boolean;
	};
}

export interface RAGQuery {
	query: string;
	context?: string[];
	systemPromptId?: string;
	systemPromptVariables?: Record<string, unknown>;
	includeEmbeddings?: boolean;
	metadata?: Record<string, unknown>;
}

export interface RAGResult {
	answer: string;
	sources: {
		text: string;
		similarity: number;
		metadata?: Record<string, unknown>;
	}[];
	prompt: string;
	reasoning?: string;
	confidence?: number;
}

export interface GenerationOptions {
	temperature?: number;
	maxTokens?: number;
	systemPromptId?: string;
	systemPromptVariables?: Record<string, unknown>;
	stopTokens?: string[];
}

/**
 * Unified AI Capabilities - Combines all AI functionality into a single interface
 * Provides LLM generation, embeddings, semantic search, and RAG workflows
 */
export class AICoreCapabilities {
	private llmState!: LLMState;
	private embeddingAdapter?: EmbeddingAdapter;
	private rerankerAdapter?: RerankerAdapter;
	private readonly config: AICoreConfig;
	private readonly knowledgeBase: Map<
		string,
		{ text: string; metadata?: Record<string, unknown>; addedAt: string }
	> = new Map();

	constructor(config: AICoreConfig) {
		// Ensure mlxModel is a valid key if present
		if (config.llm.mlxModel && typeof config.llm.mlxModel === 'string') {
			const keys = Object.keys(AVAILABLE_MLX_MODELS);

			// If it's already a key, keep it
			if (keys.includes(config.llm.mlxModel)) {
				// Type assertion: safe because of check above
				config.llm.mlxModel = config.llm.mlxModel as keyof typeof AVAILABLE_MLX_MODELS;
			}
			// If it's a value, find the corresponding key
			else {
				const keyEntry = Object.entries(AVAILABLE_MLX_MODELS).find(
					([, value]) => value === config.llm.mlxModel,
				);
				if (keyEntry) {
					config.llm.mlxModel = keyEntry[0] as keyof typeof AVAILABLE_MLX_MODELS;
				} else {
					throw new Error(`Invalid mlxModel: ${config.llm.mlxModel}`);
				}
			}
		}
		this.config = config;
		this.initializeComponents();
	}

	/**
	 * Initialize AI components based on configuration
	 */
	private initializeComponents(): void {
		// Initialize LLM state
		this.llmState = configureLLM({
			provider: this.config.llm.provider,
			endpoint: this.config.llm.endpoint || '',
			model: this.config.llm.model,
			mlxModel: this.config.llm.mlxModel as keyof typeof AVAILABLE_MLX_MODELS | undefined,
		});

		// Initialize Embedding Adapter
		if (this.config.embedding) {
			this.embeddingAdapter = createEmbeddingAdapter(this.config.embedding.provider);
		}

		// Initialize Reranker Adapter
		if (this.config.reranker) {
			this.rerankerAdapter = createRerankerAdapter(this.config.reranker.provider);
		}
	}

	/**
	 * Generate text using configured LLM
	 */
	async generate(prompt: string, options: GenerationOptions = {}): Promise<string> {
		const systemPrompt = this.resolvePromptText({
			id: options.systemPromptId,
			variables: options.systemPromptVariables,
		});
		const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

		return llmGenerate(this.llmState, fullPrompt, {
			temperature: options.temperature || this.config.llm.temperature || 0.7,
			maxTokens: options.maxTokens || this.config.llm.maxTokens || 512,
		});
	}

	/**
	 * Add documents to the knowledge base for RAG
	 */
	async addKnowledge(
		documents: string[],
		metadata?: Record<string, unknown>[],
		ids?: string[],
	): Promise<string[]> {
		if (!this.embeddingAdapter) {
			throw new Error('Embedding adapter not configured for knowledge storage');
		}

		const documentIds = await this.embeddingAdapter.addDocuments(documents, metadata, ids);

		// Store additional metadata in local knowledge base
		documents.forEach((doc, index) => {
			const id = documentIds[index];
			this.knowledgeBase.set(id, {
				text: doc,
				metadata: metadata?.[index],
				addedAt: new Date().toISOString(),
			});
		});

		return documentIds;
	}

	/**
	 * Perform semantic search in knowledge base
	 */
	async searchKnowledge(query: string, topK: number = 5, threshold: number = 0.3) {
		if (!this.embeddingAdapter) {
			throw new Error('Embedding adapter not configured for knowledge search');
		}

		return this.embeddingAdapter.similaritySearch({
			text: query,
			topK,
			threshold,
		});
	}

	/**
	 * Complete RAG workflow: Retrieve relevant context and generate answer
	 */
	async ragQuery(ragQuery: RAGQuery): Promise<RAGResult> {
		if (!this.embeddingAdapter) {
			throw new Error('Embedding adapter not configured for RAG');
		}

		const { query } = ragQuery;
		const systemPrompt = this.resolvePromptText(
			{
				id: ragQuery.systemPromptId,
				variables: ragQuery.systemPromptVariables,
			},
			'sys.a2a.rag-default',
		);
		const ragConfig = this.config.rag || {};

		// Step 1: Retrieve relevant documents
		const searchResults = await this.embeddingAdapter.similaritySearch({
			text: query,
			topK: ragConfig.topK || 5,
			threshold: ragConfig.similarityThreshold || 0.3,
		});

		// Step 2: Rerank if reranker is available
		let finalSources = searchResults;
		if (this.rerankerAdapter && searchResults.length > 0) {
			const documentsToRerank = searchResults.map((r: { text: string }) => r.text);
			const rerankedResults = await this.rerankerAdapter.rerank(
				query,
				documentsToRerank,
				ragConfig.rerankTopK || 3,
			);

			// Map reranked results back to search results
			finalSources = rerankedResults.map((rr: { originalIndex: number; score: number }) => {
				const original = searchResults[rr.originalIndex];
				return {
					...original,
					similarity: rr.score, // Update with reranker score
				};
			});
		}

		// Step 3: Construct context prompt
		const contextTexts = finalSources.map((source: { text: string }) => source.text);
		const contextPrompt = this.buildRAGPrompt(query, contextTexts, systemPrompt);

		// Step 4: Generate answer using LLM
		const answer = await this.generate(contextPrompt, {
			temperature: 0.3, // Lower temperature for factual responses
			maxTokens: 1024,
		});

		// Step 5: Return structured result
		return {
			answer,
			sources: finalSources.map(
				(source: { text: string; similarity: number; metadata?: Record<string, unknown> }) => ({
					text: source.text,
					similarity: source.similarity,
					metadata: source.metadata,
				}),
			),
			prompt: contextPrompt,
			confidence: this.calculateConfidence(finalSources),
		};
	}

	/**
	 * Get embedding for text (if embedding adapter available)
	 */
	async getEmbedding(text: string): Promise<number[] | null> {
		if (!this.embeddingAdapter) {
			return null;
		}

		const embeddings = await this.embeddingAdapter.generateEmbeddings(text);
		return embeddings[0];
	}

	/**
	 * Calculate semantic similarity between two texts
	 */
	async calculateSimilarity(text1: string, text2: string): Promise<number | null> {
		if (!this.embeddingAdapter) {
			return null;
		}

		const embeddings = await this.embeddingAdapter.generateEmbeddings([text1, text2]);
		const [emb1, emb2] = embeddings;

		// Cosine similarity
		let dotProduct = 0;
		let norm1 = 0;
		let norm2 = 0;

		for (let i = 0; i < emb1.length; i++) {
			dotProduct += emb1[i] * emb2[i];
			norm1 += emb1[i] * emb1[i];
			norm2 += emb2[i] * emb2[i];
		}

		if (norm1 === 0 || norm2 === 0) return 0;
		return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
	}

	/**
	 * Get system capabilities and status
	 */
	async getCapabilities(): Promise<{
		llm: { provider: string; model: string; healthy: boolean };
		embedding?: { provider: string; dimensions: number; documents: number };
		reranker?: { provider: string; available: boolean };
		features: string[];
	}> {
		// Check LLM health
		const llmHealth = await checkProviderHealth(this.llmState);

		const capabilities = {
			llm: {
				provider: getProvider(this.llmState),
				model: getModel(this.llmState),
				healthy: llmHealth.healthy,
			},
			embedding: this.embeddingAdapter
				? {
						provider: this.embeddingAdapter.getStats().provider,
						dimensions: this.embeddingAdapter.getStats().dimensions,
						documents: this.embeddingAdapter.getStats().totalDocuments,
					}
				: undefined,
			reranker: this.rerankerAdapter
				? {
						provider: 'available',
						available: true,
					}
				: undefined,
			features: this.getAvailableFeatures(),
		};

		return capabilities;
	}

	/**
	 * Clear knowledge base (with proper resource cleanup)
	 */
	async clearKnowledge(): Promise<void> {
		this.knowledgeBase.clear();

		// Clear embedding adapter's vector store if available
		if (this.embeddingAdapter && typeof this.embeddingAdapter.clearDocuments === 'function') {
			await this.embeddingAdapter.clearDocuments();
		}
	}

	/**
	 * Proper resource cleanup and shutdown
	 */
	async shutdown(): Promise<void> {
		// Clear knowledge base
		await this.clearKnowledge();
		// Cleanup embedding adapter resources
		if (this.embeddingAdapter && typeof this.embeddingAdapter.shutdown === 'function') {
			await this.embeddingAdapter.shutdown();
		}

		// Cleanup reranker adapter resources
		if (this.rerankerAdapter && typeof this.rerankerAdapter.shutdown === 'function') {
			await this.rerankerAdapter.shutdown();
		}

		// Cleanup LLM resources
		if (this.llmState) {
			await shutdownLLM(this.llmState);
		}
	}

	/**
	 * Get knowledge base statistics
	 */
	getKnowledgeStats(): {
		documentsStored: number;
		embeddingStats?: unknown;
	} {
		return {
			documentsStored: this.knowledgeBase.size,
			embeddingStats: this.embeddingAdapter?.getStats(),
		};
	}

	private resolvePromptText(
		config: { id?: string; variables?: Record<string, unknown> },
		fallbackId?: string,
	): string {
		const promptId = config.id ?? fallbackId;
		if (!promptId) return '';

		const promptRecord = getPrompt(promptId);
		if (promptRecord) {
			const rendered = renderPrompt(promptRecord, config.variables ?? {});
			validatePromptUsage(rendered, promptId);
			capturePromptUsage(promptRecord);
			return rendered;
		}

		const safeTemplate = getSafePrompt(promptId, config.variables ?? {});
		validatePromptUsage(safeTemplate, promptId);
		return safeTemplate;
	}

	/**
	 * Build RAG prompt with context
	 */
	private buildRAGPrompt(query: string, context: string[], systemPrompt?: string): string {
		let contextSection = '';
		if (context.length > 0) {
			const contextLines = context.map((c, i) => `${i + 1}. ${c}`).join('\n\n');
			contextSection = `Context information:\n${contextLines}\n\n`;
		}

		const resolvedSystem = systemPrompt ?? this.resolvePromptText({}, 'sys.a2a.rag-default');
		const system = resolvedSystem ? `${resolvedSystem}\n\n` : '';

		return `${system}${contextSection}Question: ${query}\n\nAnswer:`;
	}

	/**
	 * Calculate confidence based on source similarities
	 */
	private calculateConfidence(sources: Array<{ similarity: number }>): number {
		if (sources.length === 0) return 0;

		const avgSimilarity = sources.reduce((sum, s) => sum + s.similarity, 0) / sources.length;
		const topSimilarity = sources[0]?.similarity || 0;

		// Combine average and top similarity with some weighting
		return Math.min(0.8 * topSimilarity + 0.2 * avgSimilarity, 1.0);
	}

	/**
	 * Get list of available features
	 */
	private getAvailableFeatures(): string[] {
		const features = ['text-generation'];

		if (this.embeddingAdapter) {
			features.push('embeddings', 'semantic-search', 'knowledge-base');
		}

		if (this.rerankerAdapter) {
			features.push('reranking');
		}

		if (this.embeddingAdapter && this.rerankerAdapter) {
			features.push('rag', 'question-answering');
		}

		return features;
	}
}

/**
 * Create AI capabilities with common configurations
 */
export const createAICapabilities = (
	preset: 'full' | 'llm-only' | 'rag-focused' | 'minimal' = 'full',
): AICoreCapabilities => {
	const env = process.env as Record<string, unknown>;
	const rerankerProvider = env.RERANKER_PROVIDER as 'transformers' | 'local' | 'mock' | undefined;

	// Default MLX model configuration
	const mlxModelValue = AVAILABLE_MLX_MODELS.QWEN_SMALL;

	const configs: Record<string, AICoreConfig> = {
		full: {
			llm: {
				provider: 'mlx',
				mlxModel: mlxModelValue,
				endpoint: 'http://localhost:8000',
				temperature: 0.7,
				maxTokens: 512,
			},
			embedding: {
				provider: 'sentence-transformers',
				dimensions: 1024,
			},
			rag: {
				topK: 5,
				similarityThreshold: 0.3,
				rerankTopK: 3,
			},
		},
		'llm-only': {
			llm: {
				provider: 'mlx',
				mlxModel: mlxModelValue,
				endpoint: 'http://localhost:8000',
			},
		},
		'rag-focused': {
			llm: {
				provider: 'mlx',
				mlxModel: mlxModelValue,
				endpoint: 'http://localhost:8000',
				temperature: 0.3, // Lower temperature for factual RAG
			},
			embedding: {
				provider: 'sentence-transformers',
				dimensions: 1024,
			},
			rag: {
				topK: 8,
				similarityThreshold: 0.25,
				rerankTopK: 5,
			},
		},
	};

	if (rerankerProvider) {
		const reranker = { provider: rerankerProvider } as AICoreConfig['reranker'];
		if (configs.full.embedding) configs.full.reranker = reranker;
		if (configs['rag-focused'].embedding) configs['rag-focused'].reranker = reranker;
	}

	// Map legacy/minimal preset to llm-only for test convenience
	const resolvedPreset = preset === 'minimal' ? 'llm-only' : preset;
	return new AICoreCapabilities(configs[resolvedPreset]);
};

/**
 * Available AI model presets
 */
export const AI_PRESETS = {
	FULL_CAPABILITIES: 'full',
	LLM_ONLY: 'llm-only',
	RAG_FOCUSED: 'rag-focused',
} as const;
