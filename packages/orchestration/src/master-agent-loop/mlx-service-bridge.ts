/**
 * @fileoverview MLX Service Bridge for nO Orchestration System
 * @module MLXServiceBridge
 * @description Integrates MLX adapter into nO agent orchestration with proper error handling and TDD
 * @author brAInwav Development Team
 * @version 1.0.0
 * @since 2024-12-09
 */

import { EventEmitter } from 'node:events';
import { nanoid } from 'nanoid';
import { z } from 'zod';

// Local MLX adapter interface definitions
interface MLXAdapterApi {
	isAvailable(): Promise<boolean>;
	generateEmbedding(request: {
		text: string;
		model?: string;
	}): Promise<{ embedding: number[]; model: string }>;
	generateEmbeddings(request: {
		texts: string[];
		model?: string;
	}): Promise<{ embedding: number[]; model: string }[]>;
	generateChat(request: {
		messages: Message[];
		model?: string;
		max_tokens?: number;
		temperature?: number;
	}): Promise<{ content: string; model: string }>;
	rerank(
		query: string,
		documents: string[],
		model?: string,
	): Promise<{ scores: number[]; model: string }>;
}

interface Message {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

/**
 * MLX service request schemas
 */
export const MLXEmbeddingRequestSchema = z.object({
	text: z.string().min(1),
	model: z.string().optional(),
	requestId: z.string().optional(),
});

export const MLXChatRequestSchema = z.object({
	messages: z
		.array(
			z.object({
				role: z.enum(['system', 'user', 'assistant']),
				content: z.string().min(1),
			}),
		)
		.min(1),
	model: z.string().optional(),
	max_tokens: z.number().positive().optional(),
	temperature: z.number().min(0).max(2).optional(),
	requestId: z.string().optional(),
});

export type MLXEmbeddingRequest = z.infer<typeof MLXEmbeddingRequestSchema>;
export type MLXChatRequest = z.infer<typeof MLXChatRequestSchema>;

/**
 * MLX service response schemas
 */
export const MLXEmbeddingResponseSchema = z.object({
	embedding: z.array(z.number()),
	model: z.string(),
	requestId: z.string(),
	processingTime: z.number(),
	timestamp: z.date(),
});

export const MLXChatResponseSchema = z.object({
	content: z.string(),
	model: z.string(),
	requestId: z.string(),
	processingTime: z.number(),
	timestamp: z.date(),
});

export type MLXEmbeddingResponse = z.infer<typeof MLXEmbeddingResponseSchema>;
export type MLXChatResponse = z.infer<typeof MLXChatResponseSchema>;

/**
 * MLX service bridge configuration
 */
export const MLXServiceConfigSchema = z.object({
	defaultModel: z.string().default('mlx-default'),
	timeout: z.number().positive().default(30000),
	retryAttempts: z.number().min(0).default(3),
	retryDelay: z.number().positive().default(1000),
	enableMetrics: z.boolean().default(true),
});

export type MLXServiceConfig = z.infer<typeof MLXServiceConfigSchema>;

/**
 * MLX service error codes
 */
export enum MLXServiceErrorCode {
	ADAPTER_NOT_AVAILABLE = 'ADAPTER_NOT_AVAILABLE',
	REQUEST_VALIDATION_FAILED = 'REQUEST_VALIDATION_FAILED',
	INFERENCE_FAILED = 'INFERENCE_FAILED',
	TIMEOUT_EXCEEDED = 'TIMEOUT_EXCEEDED',
	RETRY_EXHAUSTED = 'RETRY_EXHAUSTED',
}

/**
 * MLX service error class
 */
export class MLXServiceError extends Error {
	constructor(
		public readonly code: MLXServiceErrorCode,
		message: string,
		public readonly context?: Record<string, unknown>,
	) {
		super(message);
		this.name = 'MLXServiceError';
	}
}

/**
 * MLX Service Bridge Class
 * Integrates MLX adapter into nO orchestration system
 */
export class MLXServiceBridge extends EventEmitter {
	private readonly config: MLXServiceConfig;
	private readonly mlxAdapter: MLXAdapterApi;
	private isInitialized = false;

	constructor(mlxAdapter: MLXAdapterApi, config?: Partial<MLXServiceConfig>) {
		super();
		this.mlxAdapter = mlxAdapter;
		this.config = MLXServiceConfigSchema.parse(config || {});
	}

	/**
	 * Initialize the MLX service bridge
	 */
	async initialize(): Promise<void> {
		const available = await this.mlxAdapter.isAvailable();
		if (!available) {
			throw new MLXServiceError(
				MLXServiceErrorCode.ADAPTER_NOT_AVAILABLE,
				'MLX adapter is not available',
				{ config: this.config },
			);
		}

		this.isInitialized = true;
		this.emit('initialized', { timestamp: new Date() });
	}

	/**
	 * Check if the service is ready
	 */
	isReady(): boolean {
		return this.isInitialized;
	}

	/**
	 * Generate single embedding
	 */
	async generateEmbedding(request: MLXEmbeddingRequest): Promise<MLXEmbeddingResponse> {
		const validated = MLXEmbeddingRequestSchema.parse(request);
		const requestId = validated.requestId || nanoid();
		const startTime = Date.now();

		try {
			this.ensureReady();

			const result = await this.executeWithRetry(
				() =>
					this.mlxAdapter.generateEmbedding({
						text: validated.text,
						model: validated.model,
					}),
				requestId,
			);

			const processingTime = Date.now() - startTime;

			const response = {
				embedding: result.embedding,
				model: result.model,
				requestId,
				processingTime,
				timestamp: new Date(),
			};

			this.emit('embedding-generated', { requestId, processingTime, model: result.model });
			return MLXEmbeddingResponseSchema.parse(response);
		} catch (error) {
			const processingTime = Date.now() - startTime;

			this.emit('embedding-failed', {
				requestId,
				error: error instanceof Error ? error.message : 'Unknown error',
				processingTime,
			});

			if (error instanceof MLXServiceError) {
				throw error;
			}

			throw new MLXServiceError(
				MLXServiceErrorCode.INFERENCE_FAILED,
				`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				{ requestId, processingTime, originalError: error },
			);
		}
	}

	/**
	 * Generate chat response
	 */
	async generateChat(request: MLXChatRequest): Promise<MLXChatResponse> {
		const validated = MLXChatRequestSchema.parse(request);
		const requestId = validated.requestId || nanoid();
		const startTime = Date.now();

		try {
			this.ensureReady();

			const result = await this.executeWithRetry(
				() =>
					this.mlxAdapter.generateChat({
						messages: validated.messages as Message[],
						model: validated.model,
						max_tokens: validated.max_tokens,
						temperature: validated.temperature,
					}),
				requestId,
			);

			const processingTime = Date.now() - startTime;

			const response = {
				content: result.content,
				model: result.model,
				requestId,
				processingTime,
				timestamp: new Date(),
			};

			this.emit('chat-generated', {
				requestId,
				processingTime,
				model: result.model,
				messageCount: validated.messages.length,
			});

			return MLXChatResponseSchema.parse(response);
		} catch (error) {
			const processingTime = Date.now() - startTime;

			this.emit('chat-failed', {
				requestId,
				error: error instanceof Error ? error.message : 'Unknown error',
				processingTime,
			});

			if (error instanceof MLXServiceError) {
				throw error;
			}

			throw new MLXServiceError(
				MLXServiceErrorCode.INFERENCE_FAILED,
				`Chat generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				{
					requestId,
					processingTime,
					messageCount: validated.messages.length,
					originalError: error,
				},
			);
		}
	}

	// Private methods

	private ensureReady(): void {
		if (!this.isInitialized) {
			throw new MLXServiceError(
				MLXServiceErrorCode.ADAPTER_NOT_AVAILABLE,
				'MLX service bridge is not initialized',
			);
		}
	}

	private async executeWithRetry<T>(operation: () => Promise<T>, requestId: string): Promise<T> {
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= this.config.retryAttempts + 1; attempt++) {
			try {
				const promise = operation();
				const result = await Promise.race([
					promise,
					new Promise<never>((_, reject) =>
						setTimeout(() => reject(new Error('Operation timeout')), this.config.timeout),
					),
				]);

				return result;
			} catch (error) {
				lastError = error as Error;

				if (lastError.message === 'Operation timeout') {
					throw new MLXServiceError(
						MLXServiceErrorCode.TIMEOUT_EXCEEDED,
						`Operation timed out after ${this.config.timeout}ms`,
						{ requestId, attempt, timeout: this.config.timeout },
					);
				}

				if (attempt <= this.config.retryAttempts) {
					await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay * attempt));
				}
			}
		}

		throw new MLXServiceError(
			MLXServiceErrorCode.RETRY_EXHAUSTED,
			`All retry attempts exhausted. Last error: ${lastError?.message}`,
			{ requestId, attempts: this.config.retryAttempts + 1, lastError },
		);
	}
}

/**
 * Factory function to create MLX service bridge
 */
export function createMLXServiceBridge(
	mlxAdapter: MLXAdapterApi,
	config?: Partial<MLXServiceConfig>,
): MLXServiceBridge {
	return new MLXServiceBridge(mlxAdapter, config);
}

// Export the MLXAdapterApi interface for external use
export type { MLXAdapterApi };
