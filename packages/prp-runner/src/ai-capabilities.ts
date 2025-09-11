/**
 * @file ai-capabilities.ts
 * @description Unified AI Capabilities Interface - Combines LLM, Embeddings, and Reranking
 * @author Cortex-OS Team
 * @version 1.0.0
 * @status TDD-DRIVEN
 */

import {
	createEmbeddingAdapter,
	createRerankerAdapter,
	type EmbeddingAdapter,
	type RerankerAdapter,
} from './embedding-adapter';
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
	systemPrompt?: string;
	includeEmbeddings?: boolean;
	metadata?: Record<string, any>;
}

export interface RAGResult {
	answer: string;
	sources: {
		text: string;
		similarity: number;
		metadata?: Record<string, any>;
	}[];
	prompt: string;
	reasoning?: string;
	confidence?: number;
}

export interface GenerationOptions {
	temperature?: number;
	maxTokens?: number;
	systemPrompt?: string;
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
	private config: AICoreConfig;
	private knowledgeBase: Map<string, any> = new Map();

	constructor(config: AICoreConfig) {
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
			mlxModel: this.config.llm.mlxModel,
		});

		// Initialize Embedding Adapter
		if (this.config.embedding) {
			this.embeddingAdapter = createEmbeddingAdapter(
				this.config.embedding.provider,
			);
		}

		// Initialize Reranker Adapter
		if (this.config.reranker) {
			this.rerankerAdapter = createRerankerAdapter(
				this.config.reranker.provider,
			);
		}
	}

	/**
	 * Generate text using configured LLM
	 */
	async generate(
		prompt: string,
		options: GenerationOptions = {},
	): Promise<string> {
		const systemPrompt = options.systemPrompt;
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
		metadata?: Record<string, any>[],
		ids?: string[],
	): Promise<string[]> {
		if (!this.embeddingAdapter) {
			throw new Error('Embedding adapter not configured for knowledge storage');
		}

		const documentIds = await this.embeddingAdapter.addDocuments(
			documents,
			metadata,
			ids,
		);

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
	async searchKnowledge(
		query: string,
		topK: number = 5,
		threshold: number = 0.3,
	) {
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

		const { query, systemPrompt, includeEmbeddings = false } = ragQuery;
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
			const documentsToRerank = searchResults.map(
				(r: { text: string }) => r.text,
			);
			const rerankedResults = await this.rerankerAdapter.rerank(
				query,
				documentsToRerank,
				ragConfig.rerankTopK || 3,
			);

			// Map reranked results back to search results
			finalSources = rerankedResults.map(
				(rr: { originalIndex: number; score: number }) => {
					const original = searchResults[rr.originalIndex];
					return {
						...original,
						similarity: rr.score, // Update with reranker score
					};
				},
			);
		}

		// Step 3: Construct context prompt
		const contextTexts = finalSources.map(
			(source: { text: string }) => source.text,
		);
		const contextPrompt = this.buildRAGPrompt(
			query,
			contextTexts,
			systemPrompt,
		);

		// Step 4: Generate answer using LLM
		const answer = await this.generate(contextPrompt, {
			temperature: 0.3, // Lower temperature for factual responses
			maxTokens: 1024,
		});

		// Step 5: Return structured result
		return {
			answer,
			sources: finalSources.map(
				(source: {
					text: string;
					similarity: number;
					metadata?: Record<string, any>;
				}) => ({
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
	async calculateSimilarity(
		text1: string,
		text2: string,
	): Promise<number | null> {
		if (!this.embeddingAdapter) {
			return null;
		}

		const embeddings = await this.embeddingAdapter.generateEmbeddings([
			text1,
			text2,
		]);
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
		if (
			this.embeddingAdapter &&
			typeof this.embeddingAdapter.clearDocuments === 'function'
		) {
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
		if (
			this.embeddingAdapter &&
			typeof this.embeddingAdapter.shutdown === 'function'
		) {
			await this.embeddingAdapter.shutdown();
		}

		// Cleanup reranker adapter resources
		if (
			this.rerankerAdapter &&
			typeof this.rerankerAdapter.shutdown === 'function'
		) {
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
		embeddingStats?: any;
	} {
		return {
			documentsStored: this.knowledgeBase.size,
			embeddingStats: this.embeddingAdapter?.getStats(),
		};
	}

	/**
	 * Build RAG prompt with context
	 */
	private buildRAGPrompt(
		query: string,
		context: string[],
		systemPrompt?: string,
	): string {
		const contextSection =
			context.length > 0
				? `Context information:\n${context.map((c, i) => `${i + 1}. ${c}`).join('\n\n')}\n\n`
				: '';

		const system = systemPrompt
			? `${systemPrompt}\n\n`
			: "You are a helpful AI assistant. Answer the question based on the provided context. If the context doesn't contain enough information, say so clearly.\n\n";

		return `${system}${contextSection}Question: ${query}\n\nAnswer:`;
	}

	/**
	 * Calculate confidence based on source similarities
	 */
	private calculateConfidence(sources: any[]): number {
		if (sources.length === 0) return 0;

		const avgSimilarity =
			sources.reduce((sum, s) => sum + s.similarity, 0) / sources.length;
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
	preset: 'full' | 'llm-only' | 'rag-focused' = 'full',
): AICoreCapabilities => {
	const env: any = (globalThis as any).process?.env ?? {};
	const rerankerProvider = env.RERANKER_PROVIDER as
		| 'transformers'
		| 'local'
		| 'mock'
		| undefined;

	const configs: Record<string, AICoreConfig> = {
		full: {
			llm: {
				provider: 'mlx',
				mlxModel: AVAILABLE_MLX_MODELS.QWEN_SMALL,
				endpoint: '',
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
				mlxModel: AVAILABLE_MLX_MODELS.QWEN_SMALL,
				endpoint: '',
			},
		},
		'rag-focused': {
			llm: {
				provider: 'mlx',
				mlxModel: AVAILABLE_MLX_MODELS.QWEN_SMALL,
				endpoint: '',
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
		if (configs['rag-focused'].embedding)
			configs['rag-focused'].reranker = reranker;
	}

	return new AICoreCapabilities(configs[preset]);
};

/**
 * Available AI model presets
 */
export const AI_PRESETS = {
	FULL_CAPABILITIES: 'full',
	LLM_ONLY: 'llm-only',
	RAG_FOCUSED: 'rag-focused',
} as const;
