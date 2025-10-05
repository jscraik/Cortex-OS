/**
 * Composite Model Provider Implementation
 * Provides unified access to MLX, Ollama, and frontier model providers with fallback
 */

import { EventEmitter } from 'node:events';
import { safeFetch, safeFetchJson } from '@cortex-os/utils';
import { z } from 'zod';
import { CircuitBreaker } from '../lib/circuit-breaker.js';
import { selectMLXModel, selectOllamaModel } from '../lib/model-selection.js';
import type { MLXAdapterApi } from '../master-agent-loop/mlx-service-bridge.js';

const isMLXAdapterApi = (value: unknown): value is MLXAdapterApi =>
	value !== null &&
	typeof value === 'object' &&
	typeof (value as MLXAdapterApi).isAvailable === 'function' &&
	typeof (value as MLXAdapterApi).generateEmbedding === 'function' &&
	typeof (value as MLXAdapterApi).generateEmbeddings === 'function' &&
	typeof (value as MLXAdapterApi).generateChat === 'function' &&
	typeof (value as MLXAdapterApi).rerank === 'function';

/**
 * Model request schemas
 */
export const EmbeddingRequestSchema = z.object({
	texts: z.array(z.string().min(1)).min(1).max(100),
	model: z.string().optional(),
	task: z.enum(['embed', 'semantic-search', 'classification']).optional(),
});

export const ChatRequestSchema = z.object({
	messages: z.array(
		z.object({
			role: z.enum(['system', 'user', 'assistant']),
			content: z.string().min(1),
		}),
	),
	model: z.string().optional(),
	task: z.enum(['chat', 'code', 'analysis', 'reasoning']).optional(),
	maxTokens: z.number().positive().max(8192).optional(),
	temperature: z.number().min(0).max(2).optional(),
});

export const RerankRequestSchema = z.object({
	query: z.string().min(1),
	documents: z.array(z.string().min(1)).min(1).max(100),
	model: z.string().optional(),
});

export type EmbeddingRequest = z.infer<typeof EmbeddingRequestSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type RerankRequest = z.infer<typeof RerankRequestSchema>;

/**
 * Model response schemas
 */
export const EmbeddingResponseSchema = z.object({
	embeddings: z.array(z.array(z.number())),
	model: z.string(),
	provider: z.string(),
	processingTime: z.number(),
	tokensUsed: z.record(z.unknown()).optional(),
});

export const ChatResponseSchema = z.object({
	content: z.string(),
	model: z.string(),
	provider: z.string(),
	processingTime: z.number(),
	tokensUsed: z.record(z.unknown()).optional(),
	finishReason: z.string().optional(),
});

export const RerankResponseSchema = z.object({
	scores: z.array(z.number()),
	model: z.string(),
	provider: z.string(),
	processingTime: z.number(),
});

export type EmbeddingResponse = z.infer<typeof EmbeddingResponseSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type RerankResponse = z.infer<typeof RerankResponseSchema>;

/**
 * OpenAI API response types
 */
interface OpenAIEmbeddingItem {
	embedding: number[];
}

/**
 * Provider interface
 */
export interface ModelProvider {
	name: string;
	isAvailable(): Promise<boolean>;
	executeEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse>;
	executeChat(request: ChatRequest): Promise<ChatResponse>;
	executeRerank?(request: RerankRequest): Promise<RerankResponse>;
}

/**
 * MLX Provider Implementation
 */
class MLXProvider implements ModelProvider {
	readonly name = 'mlx';
	private healthCache: { available: boolean; timestamp: number } | null = null;
	private readonly circuitBreaker: CircuitBreaker;

	constructor(
		private readonly mlxService: MLXAdapterApi,
		private readonly healthCheckInterval = 30000, // 30 seconds
	) {
		this.circuitBreaker = new CircuitBreaker('mlx-provider', {
			failureThreshold: 3,
			recoveryTimeoutMs: 60000,
			monitoringWindowMs: 300000,
			halfOpenMaxCalls: 2,
		});
	}

	async isAvailable(): Promise<boolean> {
		// Check cache first
		if (this.healthCache && Date.now() - this.healthCache.timestamp < this.healthCheckInterval) {
			return this.healthCache.available;
		}

		try {
			const available = await this.circuitBreaker.execute(async () => {
				// Check if MLX service is actually available
				return (await selectMLXModel('chat')) !== null;
			});

			this.healthCache = { available, timestamp: Date.now() };
			return available;
		} catch {
			this.healthCache = { available: false, timestamp: Date.now() };
			return false;
		}
	}

	async executeEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
		return this.circuitBreaker.execute(async () => {
			const startTime = Date.now();

			// Generate embeddings for each text
			const embeddings: number[][] = [];
			for (const text of request.texts) {
				const result = await this.mlxService.generateEmbedding({
					text,
					model: request.model,
				});
				embeddings.push(result.embedding);
			}

			const processingTime = Date.now() - startTime;

			return {
				embeddings,
				model: request.model || 'mlx-default',
				provider: this.name,
				processingTime,
			};
		});
	}

	async executeChat(request: ChatRequest): Promise<ChatResponse> {
		return this.circuitBreaker.execute(async () => {
			const startTime = Date.now();

			const result = await this.mlxService.generateChat({
				messages: request.messages,
				model: request.model,
				max_tokens: request.maxTokens,
				temperature: request.temperature,
			});

			const processingTime = Date.now() - startTime;

			return {
				content: result.content,
				model: result.model,
				provider: this.name,
				processingTime,
			};
		});
	}

	async executeRerank(request: RerankRequest): Promise<RerankResponse> {
		return this.circuitBreaker.execute(async () => {
			const startTime = Date.now();

			const result = await this.mlxService.rerank(request.query, request.documents, request.model);

			const processingTime = Date.now() - startTime;

			return {
				scores: result.scores,
				model: result.model,
				provider: this.name,
				processingTime,
			};
		});
	}
}

/**
 * Ollama Provider Implementation
 */
class OllamaProvider implements ModelProvider {
	readonly name = 'ollama';
	private healthCache: { available: boolean; timestamp: number } | null = null;
	private readonly circuitBreaker: CircuitBreaker;

	constructor(
		private readonly baseUrl = 'http://localhost:11434',
		private readonly healthCheckInterval = 30000,
	) {
		this.circuitBreaker = new CircuitBreaker('ollama-provider', {
			failureThreshold: 3,
			recoveryTimeoutMs: 60000,
			monitoringWindowMs: 300000,
			halfOpenMaxCalls: 2,
		});
	}

	async isAvailable(): Promise<boolean> {
		if (this.healthCache && Date.now() - this.healthCache.timestamp < this.healthCheckInterval) {
			return this.healthCache.available;
		}

		try {
			const available = await this.circuitBreaker.execute(async () => {
				return (await selectOllamaModel('chat')) !== null;
			});

			this.healthCache = { available, timestamp: Date.now() };
			return available;
		} catch {
			this.healthCache = { available: false, timestamp: Date.now() };
			return false;
		}
	}

	async executeEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
		return this.circuitBreaker.execute(async () => {
			const startTime = Date.now();

			// Use nomic-embed-text for embeddings
			const data = await this.postJson<{ embedding: number[]; model: string }>('/api/embeddings', {
				model: request.model || 'nomic-embed-text',
				prompt: request.texts[0], // Ollama only supports single text embeddings
			});
			const processingTime = Date.now() - startTime;

			return {
				embeddings: [data.embedding],
				model: data.model,
				provider: this.name,
				processingTime,
			};
		});
	}

	async executeChat(request: ChatRequest): Promise<ChatResponse> {
		return this.circuitBreaker.execute(async () => {
			const startTime = Date.now();

			// Select model based on task or use default
			const model = request.model || (await this.selectModelForTask(request.task || 'chat'));

			const data = await this.postJson<{
				response: string;
				model: string;
				prompt_eval_count?: number;
				eval_count?: number;
			}>('/api/generate', {
				model,
				prompt: this.formatMessages(request.messages),
				stream: false,
				options: {
					temperature: request.temperature ?? 0.7,
					num_predict: request.maxTokens,
				},
			});
			const processingTime = Date.now() - startTime;

			return {
				content: data.response,
				model: data.model,
				provider: this.name,
				processingTime,
				tokensUsed: {
					prompt: data.prompt_eval_count,
					completion: data.eval_count,
				},
			};
		});
	}

	private async selectModelForTask(task: string): Promise<string> {
		const modelMap: Record<string, string> = {
			chat: 'llama3.2:3b',
			code: 'codellama:7b',
			analysis: 'llama3.2:8b',
			reasoning: 'llama3.2:8b',
		};

		return modelMap[task] || modelMap.chat;
	}

	private formatMessages(messages: Array<{ role: string; content: string }>): string {
		return messages
			.map((msg) => {
				if (msg.role === 'system') {
					return `System: ${msg.content}`;
				} else if (msg.role === 'user') {
					return `User: ${msg.content}`;
				} else {
					return `Assistant: ${msg.content}`;
				}
			})
			.join('\n\n');
	}

	private async postJson<T>(path: string, payload: unknown): Promise<T> {
		const url = new URL(path, this.baseUrl);
		return safeFetchJson<T>(url.toString(), {
			allowedHosts: [url.hostname.toLowerCase()],
			allowedProtocols: [url.protocol],
			allowLocalhost: true,
			timeout: 30000,
			fetchOptions: {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			},
		});
	}
}

/**
 * OpenAI Provider Implementation
 */
class OpenAIProvider implements ModelProvider {
	readonly name = 'openai';
	private readonly apiKey: string;
	private readonly baseUrl: string;
	private readonly circuitBreaker: CircuitBreaker;

	constructor(config: { apiKey: string; baseUrl?: string }) {
		this.apiKey = config.apiKey;
		this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
		this.circuitBreaker = new CircuitBreaker('openai-provider', {
			failureThreshold: 5,
			recoveryTimeoutMs: 30000,
			monitoringWindowMs: 300000,
			halfOpenMaxCalls: 5,
		});
	}

	async isAvailable(): Promise<boolean> {
		try {
			await this.circuitBreaker.execute(async () => {
				const url = new URL('/models', this.baseUrl);
				const response = await safeFetch(url.toString(), {
					allowedHosts: [url.hostname.toLowerCase()],
					allowedProtocols: [url.protocol],
					allowLocalhost: false,
					timeout: 10000,
					fetchOptions: {
						headers: { Authorization: `Bearer ${this.apiKey}` },
					},
				});
				if (!response.ok) {
					throw new Error(`OpenAI API unavailable: ${response.statusText}`);
				}
			});
			return true;
		} catch {
			return false;
		}
	}

	async executeEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
		return this.circuitBreaker.execute(async () => {
			const startTime = Date.now();

			const data = await this.postJson<{
				data: OpenAIEmbeddingItem[];
				model: string;
				usage: { total_tokens: number };
			}>('/embeddings', {
				model: request.model || 'text-embedding-3-small',
				input: request.texts,
			});
			const processingTime = Date.now() - startTime;

			return {
				embeddings: data.data.map((item: OpenAIEmbeddingItem) => item.embedding),
				model: data.model,
				provider: this.name,
				processingTime,
				tokensUsed: { total: data.usage.total_tokens },
			};
		});
	}

	async executeChat(request: ChatRequest): Promise<ChatResponse> {
		return this.circuitBreaker.execute(async () => {
			const startTime = Date.now();

			const model = this.selectModelForTask(request.task || 'chat');

			const data = await this.postJson<{
				choices: Array<{ message: { content: string }; finish_reason?: string }>;
				model: string;
				usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
			}>('/chat/completions', {
				model,
				messages: request.messages,
				max_tokens: request.maxTokens,
				temperature: request.temperature,
			});
			const processingTime = Date.now() - startTime;

			return {
				content: data.choices[0]?.message?.content ?? '',
				model: data.model,
				provider: this.name,
				processingTime,
				tokensUsed: data.usage,
				finishReason: data.choices[0]?.finish_reason,
			};
		});
	}

	private selectModelForTask(task: string): string {
		const modelMap: Record<string, string> = {
			chat: 'gpt-4o-mini',
			code: 'gpt-4o',
			analysis: 'gpt-4o',
			reasoning: 'gpt-4o',
		};

		return modelMap[task] || modelMap.chat;
	}

	private async postJson<T>(path: string, payload: unknown): Promise<T> {
		const url = new URL(path, this.baseUrl);
		return safeFetchJson<T>(url.toString(), {
			allowedHosts: [url.hostname.toLowerCase()],
			allowedProtocols: [url.protocol],
			allowLocalhost: false,
			timeout: 30000,
			fetchOptions: {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			},
		});
	}
}

/**
 * Composite Provider Configuration
 */
export const CompositeProviderConfigSchema = z.object({
	mlx: z
		.object({
			enabled: z.boolean().default(true),
			service: z
				.custom<MLXAdapterApi>((value) => value === undefined || isMLXAdapterApi(value), {
					message: 'MLX service must satisfy the MLXAdapterApi contract',
				})
				.optional(),
			priority: z.number().min(1).max(10).default(1),
		})
		.optional(),
	ollama: z
		.object({
			enabled: z.boolean().default(true),
			baseUrl: z.string().default('http://localhost:11434'),
			priority: z.number().min(1).max(10).default(2),
		})
		.optional(),
	openai: z
		.object({
			enabled: z.boolean().default(false),
			apiKey: z.string().optional(),
			baseUrl: z.string().optional(),
			priority: z.number().min(1).max(10).default(3),
		})
		.optional(),
	fallbackTimeout: z.number().positive().default(5000),
});

export type CompositeProviderConfig = z.infer<typeof CompositeProviderConfigSchema>;

/**
 * Composite Model Provider
 * Manages multiple providers with fallback capability
 */
export class CompositeModelProvider extends EventEmitter {
	private readonly providers: Array<{ provider: ModelProvider; priority: number }> = [];
	private readonly config: CompositeProviderConfig;

	constructor(config: CompositeProviderConfig) {
		super();
		this.config = CompositeProviderConfigSchema.parse(config);

		// Initialize providers based on configuration
		if (this.config.mlx?.enabled && this.config.mlx.service) {
			this.providers.push({
				provider: new MLXProvider(this.config.mlx.service),
				priority: this.config.mlx.priority,
			});
		}

		if (this.config.ollama?.enabled) {
			this.providers.push({
				provider: new OllamaProvider(this.config.ollama.baseUrl),
				priority: this.config.ollama.priority,
			});
		}

		if (this.config.openai?.enabled && this.config.openai.apiKey) {
			this.providers.push({
				provider: new OpenAIProvider({
					apiKey: this.config.openai.apiKey,
					baseUrl: this.config.openai.baseUrl,
				}),
				priority: this.config.openai.priority,
			});
		}

		// Sort by priority
		this.providers.sort((a, b) => a.priority - b.priority);
	}

	/**
	 * Get list of configured providers
	 */
	getProviders(): ModelProvider[] {
		return this.providers.map((p) => p.provider);
	}

	/**
	 * Check overall system health
	 */
	async healthCheck(): Promise<{
		healthy: boolean;
		providers: Array<{ name: string; available: boolean; error?: string }>;
	}> {
		const providerHealths = await Promise.allSettled(
			this.providers.map(async ({ provider }) => {
				const available = await provider.isAvailable();
				return { name: provider.name, available };
			}),
		);

		const providers = providerHealths.map((result, index) => {
			if (result.status === 'fulfilled') {
				return result.value;
			} else {
				return {
					name: this.providers[index].provider.name,
					available: false,
					error: result.reason.message,
				};
			}
		});

		const healthy = providers.some((p) => p.available);

		return { healthy, providers };
	}

	/**
	 * Execute request with fallback across providers
	 */
	private async executeWithFallback<
		RequestType extends EmbeddingRequest | ChatRequest | RerankRequest,
		ResultType,
	>(
		request: RequestType,
		operation: (provider: ModelProvider, request: RequestType) => Promise<ResultType>,
	): Promise<{ result: ResultType; provider: string; attempts: number }> {
		this.validateProvidersConfigured();

		let lastError: Error | null = null;
		const attempts: number[] = [];

		for (const { provider } of this.providers) {
			const attemptStart = Date.now();
			attempts.push(attemptStart);

			try {
				const result = await this.executeWithProvider(provider, request, operation, attemptStart);
				return { result, provider: provider.name, attempts: attempts.length };
			} catch (error) {
				lastError = this.handleProviderError(error as Error, provider, attemptStart);
			}
		}

		throw this.createFinalError(lastError);
	}

	private validateProvidersConfigured(): void {
		if (this.providers.length === 0) {
			throw new Error('No providers configured');
		}
	}

	private async executeWithProvider<
		RequestType extends EmbeddingRequest | ChatRequest | RerankRequest,
		ResultType,
	>(
		provider: ModelProvider,
		request: RequestType,
		operation: (provider: ModelProvider, request: RequestType) => Promise<ResultType>,
		attemptStart: number,
	): Promise<ResultType> {
		const available = await provider.isAvailable();
		if (!available) {
			this.emit('provider-skipped', {
				provider: provider.name,
				reason: 'unavailable',
				brand: 'brAInwav',
				message: `brAInwav provider ${provider.name} skipped: unavailable`,
			});
			throw new Error(`Provider ${provider.name} unavailable`);
		}

		const result = await Promise.race([
			operation(provider, request),
			this.createTimeoutPromise(provider),
		]);

		this.emit('provider-success', {
			provider: provider.name,
			processingTime: Date.now() - attemptStart,
			brand: 'brAInwav',
			message: `brAInwav provider ${provider.name} succeeded`,
		});

		return result;
	}

	private createTimeoutPromise(provider: ModelProvider): Promise<never> {
		return new Promise<never>((_, reject) =>
			setTimeout(
				() => reject(new Error(`Provider ${provider.name} timeout`)),
				this.config.fallbackTimeout,
			),
		);
	}

	private handleProviderError(error: Error, provider: ModelProvider, attemptStart: number): Error {
		this.emit('provider-failed', {
			provider: provider.name,
			error: error.message,
			processingTime: Date.now() - attemptStart,
			brand: 'brAInwav',
			message: `brAInwav provider ${provider.name} failed: ${error.message}`,
		});
		return error;
	}

	private createFinalError(lastError: Error | null): Error {
		return new Error(
			`brAInwav all providers failed. Last error: ${lastError?.message || 'Unknown error'}`,
		);
	}

	/**
	 * Generate embeddings with fallback
	 */
	async generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
		const validated = EmbeddingRequestSchema.parse(request);

		const { result, provider, attempts } = await this.executeWithFallback(
			validated,
			async (p, req) => await p.executeEmbeddings(req),
		);

		this.emit('embeddings-generated', {
			requestId: crypto.randomUUID(),
			provider,
			attempts,
			textCount: validated.texts.length,
			brand: 'brAInwav',
			message: `brAInwav embeddings generated by ${provider}`,
		});

		return result;
	}

	/**
	 * Generate chat response with fallback
	 */
	async generateChat(request: ChatRequest): Promise<ChatResponse> {
		const validated = ChatRequestSchema.parse(request);

		const { result, provider, attempts } = await this.executeWithFallback(
			validated,
			async (p, req) => await p.executeChat(req),
		);

		this.emit('chat-generated', {
			requestId: crypto.randomUUID(),
			provider,
			attempts,
			messageCount: validated.messages.length,
			brand: 'brAInwav',
			message: `brAInwav chat generated by ${provider}`,
		});

		return result;
	}

	/**
	 * Rerank documents with fallback
	 */
	async rerank(request: RerankRequest): Promise<RerankResponse> {
		const validated = RerankRequestSchema.parse(request);

		const { result, provider, attempts } = await this.executeWithFallback(
			validated,
			async (p, req) => {
				if (p.executeRerank) {
					return await p.executeRerank(req);
				}
				throw new Error(`Provider ${p.name} does not support reranking`);
			},
		);

		this.emit('rerank-completed', {
			requestId: crypto.randomUUID(),
			provider,
			attempts,
			documentCount: validated.documents.length,
			brand: 'brAInwav',
			message: `brAInwav rerank completed by ${provider}`,
		});

		return result;
	}
}

/**
 * Factory function to create composite provider
 */
export function createCompositeProvider(config: CompositeProviderConfig): CompositeModelProvider {
	return new CompositeModelProvider(config);
}
