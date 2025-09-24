/**
 * @fileoverview MLX Service Bridge Tests
 * @module MLXServiceBridge.test
 * @description Test-driven development for MLX adapter integration with nO orchestration
 * @author brAInwav Development Team
 * @version 1.0.0
 * @since 2024-12-09
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MLXAdapterApi } from '../mlx-service-bridge.js';
import {
	createMLXServiceBridge,
	MLXServiceBridge,
	MLXServiceError,
	MLXServiceErrorCode,
} from '../mlx-service-bridge.js';

/**
 * Mock MLX adapter for testing
 */
class MockMLXAdapter implements MLXAdapterApi {
	private available = true;
	private shouldFail = false;
	private delay = 0;

	async isAvailable(): Promise<boolean> {
		return this.available;
	}

	async generateEmbedding(request: { text: string; model?: string }) {
		if (this.shouldFail) {
			throw new Error('Mock embedding failure');
		}

		if (this.delay > 0) {
			await new Promise((resolve) => setTimeout(resolve, this.delay));
		}

		return {
			embedding: [0.1, 0.2, 0.3, 0.4],
			model: request.model || 'mlx-default',
		};
	}

	async generateEmbeddings(request: { texts: string[]; model?: string }) {
		if (this.shouldFail) {
			throw new Error('Mock batch embedding failure');
		}

		return request.texts.map((_text) => ({
			embedding: [0.1, 0.2, 0.3, 0.4],
			model: request.model || 'mlx-default',
		}));
	}

	async generateChat(request: {
		messages: Array<{ role: string; content: string }>;
		model?: string;
		max_tokens?: number;
		temperature?: number;
	}) {
		if (this.shouldFail) {
			throw new Error('Mock chat failure');
		}

		const lastMessage = request.messages[request.messages.length - 1];
		return {
			content: `Response to: ${lastMessage?.content || 'empty'}`,
			model: request.model || 'mlx-chat',
		};
	}

	async rerank(_query: string, documents: string[], model?: string) {
		if (this.shouldFail) {
			throw new Error('Mock rerank failure');
		}

		return {
			scores: documents.map((_, i) => 1.0 - i * 0.1),
			model: model || 'mlx-rerank',
		};
	}

	// Test helper methods
	setAvailable(available: boolean): void {
		this.available = available;
	}

	setShouldFail(shouldFail: boolean): void {
		this.shouldFail = shouldFail;
	}

	setDelay(delay: number): void {
		this.delay = delay;
	}
}

describe('MLXServiceBridge', () => {
	let mockAdapter: MockMLXAdapter;
	let serviceBridge: MLXServiceBridge;

	beforeEach(() => {
		mockAdapter = new MockMLXAdapter();
		serviceBridge = new MLXServiceBridge(mockAdapter, {
			defaultModel: 'test-model',
			timeout: 5000,
			retryAttempts: 2,
			retryDelay: 100,
		});
	});

	describe('Initialization', () => {
		it('should initialize successfully when adapter is available', async () => {
			const initSpy = vi.fn();
			serviceBridge.on('initialized', initSpy);

			await serviceBridge.initialize();

			expect(serviceBridge.isReady()).toBeTruthy();
			expect(initSpy).toHaveBeenCalledWith({ timestamp: expect.any(Date) });
		});

		it('should fail initialization when adapter is not available', async () => {
			mockAdapter.setAvailable(false);

			await expect(serviceBridge.initialize()).rejects.toThrow(
				expect.objectContaining({
					code: MLXServiceErrorCode.ADAPTER_NOT_AVAILABLE,
					message: 'MLX adapter is not available',
				}),
			);

			expect(serviceBridge.isReady()).toBeFalsy();
		});

		it('should require initialization before use', async () => {
			await expect(serviceBridge.generateEmbedding({ text: 'test' })).rejects.toThrow(
				expect.objectContaining({
					code: MLXServiceErrorCode.ADAPTER_NOT_AVAILABLE,
					message: 'MLX service bridge is not initialized',
				}),
			);
		});
	});

	describe('Embedding Generation', () => {
		beforeEach(async () => {
			await serviceBridge.initialize();
		});

		it('should generate embeddings successfully', async () => {
			const generatedSpy = vi.fn();
			serviceBridge.on('embedding-generated', generatedSpy);

			const result = await serviceBridge.generateEmbedding({
				text: 'test text',
				model: 'test-embedding-model',
			});

			expect(result).toEqual(
				expect.objectContaining({
					embedding: [0.1, 0.2, 0.3, 0.4],
					model: 'test-embedding-model',
					requestId: expect.any(String),
					processingTime: expect.any(Number),
					timestamp: expect.any(Date),
				}),
			);

			expect(generatedSpy).toHaveBeenCalledWith({
				requestId: result.requestId,
				processingTime: expect.any(Number),
				model: 'test-embedding-model',
			});
		});

		it('should handle embedding generation failures', async () => {
			mockAdapter.setShouldFail(true);
			const failedSpy = vi.fn();
			serviceBridge.on('embedding-failed', failedSpy);

			await expect(serviceBridge.generateEmbedding({ text: 'test' })).rejects.toThrow(
				expect.objectContaining({
					code: MLXServiceErrorCode.INFERENCE_FAILED,
					message: expect.stringContaining('Embedding generation failed'),
				}),
			);

			expect(failedSpy).toHaveBeenCalledWith({
				requestId: expect.any(String),
				error: 'Mock embedding failure',
				processingTime: expect.any(Number),
			});
		});

		it('should validate embedding requests', async () => {
			await expect(serviceBridge.generateEmbedding({ text: '' })).rejects.toThrow(); // Zod validation error
		});

		it('should use provided request ID', async () => {
			const customRequestId = 'custom-request-123';

			const result = await serviceBridge.generateEmbedding({
				text: 'test',
				requestId: customRequestId,
			});

			expect(result.requestId).toBe(customRequestId);
		});
	});

	describe('Chat Generation', () => {
		beforeEach(async () => {
			await serviceBridge.initialize();
		});

		it('should generate chat responses successfully', async () => {
			const generatedSpy = vi.fn();
			serviceBridge.on('chat-generated', generatedSpy);

			const result = await serviceBridge.generateChat({
				messages: [{ role: 'user', content: 'Hello, how are you?' }],
				model: 'test-chat-model',
				max_tokens: 100,
				temperature: 0.7,
			});

			expect(result).toEqual(
				expect.objectContaining({
					content: 'Response to: Hello, how are you?',
					model: 'test-chat-model',
					requestId: expect.any(String),
					processingTime: expect.any(Number),
					timestamp: expect.any(Date),
				}),
			);

			expect(generatedSpy).toHaveBeenCalledWith({
				requestId: result.requestId,
				processingTime: expect.any(Number),
				model: 'test-chat-model',
				messageCount: 1,
			});
		});

		it('should handle chat generation failures', async () => {
			mockAdapter.setShouldFail(true);
			const failedSpy = vi.fn();
			serviceBridge.on('chat-failed', failedSpy);

			await expect(
				serviceBridge.generateChat({
					messages: [{ role: 'user', content: 'test' }],
				}),
			).rejects.toThrow(
				expect.objectContaining({
					code: MLXServiceErrorCode.INFERENCE_FAILED,
					message: expect.stringContaining('Chat generation failed'),
				}),
			);

			expect(failedSpy).toHaveBeenCalledWith({
				requestId: expect.any(String),
				error: 'Mock chat failure',
				processingTime: expect.any(Number),
			});
		});

		it('should validate chat requests', async () => {
			await expect(serviceBridge.generateChat({ messages: [] })).rejects.toThrow(); // Zod validation error for empty messages

			await expect(
				serviceBridge.generateChat({
					messages: [{ role: 'user', content: '' }],
				}),
			).rejects.toThrow(); // Zod validation error for empty content
		});
	});

	describe('Retry Logic', () => {
		beforeEach(async () => {
			await serviceBridge.initialize();
		});

		it('should retry failed operations', async () => {
			let callCount = 0;
			const originalMethod = mockAdapter.generateEmbedding;

			mockAdapter.generateEmbedding = vi.fn(async (request) => {
				callCount++;
				if (callCount < 3) {
					throw new Error('Temporary failure');
				}
				return originalMethod.call(mockAdapter, request);
			});

			const result = await serviceBridge.generateEmbedding({
				text: 'test with retry',
			});

			expect(result.embedding).toEqual([0.1, 0.2, 0.3, 0.4]);
			expect(callCount).toBe(3); // Initial attempt + 2 retries
		});

		it('should fail after exhausting retries', async () => {
			mockAdapter.setShouldFail(true);

			await expect(serviceBridge.generateEmbedding({ text: 'test' })).rejects.toThrow(
				expect.objectContaining({
					code: MLXServiceErrorCode.INFERENCE_FAILED,
				}),
			);
		});
	});

	describe('Timeout Handling', () => {
		beforeEach(async () => {
			await serviceBridge.initialize();
		});

		it('should timeout long-running operations', async () => {
			mockAdapter.setDelay(10000); // 10 second delay

			await expect(serviceBridge.generateEmbedding({ text: 'test timeout' })).rejects.toThrow(
				expect.objectContaining({
					code: MLXServiceErrorCode.TIMEOUT_EXCEEDED,
					message: expect.stringContaining('Operation timed out'),
				}),
			);
		});

		it('should complete operations within timeout', async () => {
			mockAdapter.setDelay(100); // 100ms delay, well within 5s timeout

			const result = await serviceBridge.generateEmbedding({
				text: 'test within timeout',
			});

			expect(result.embedding).toEqual([0.1, 0.2, 0.3, 0.4]);
		});
	});

	describe('Factory Function', () => {
		it('should create service bridge via factory', () => {
			const bridge = createMLXServiceBridge(mockAdapter, {
				defaultModel: 'factory-model',
			});

			expect(bridge).toBeInstanceOf(MLXServiceBridge);
			expect(bridge.isReady()).toBeFalsy(); // Not initialized yet
		});

		it('should work with minimal configuration', () => {
			const bridge = createMLXServiceBridge(mockAdapter);

			expect(bridge).toBeInstanceOf(MLXServiceBridge);
		});
	});

	describe('Error Context', () => {
		beforeEach(async () => {
			await serviceBridge.initialize();
		});

		it('should provide detailed error context', async () => {
			mockAdapter.setShouldFail(true);

			try {
				await serviceBridge.generateEmbedding({
					text: 'test error context',
					requestId: 'error-test-123',
				});
				expect.fail('Should have thrown an error');
			} catch (error) {
				expect(error).toBeInstanceOf(MLXServiceError);
				expect(error.code).toBe(MLXServiceErrorCode.INFERENCE_FAILED);
				expect(error.context).toEqual(
					expect.objectContaining({
						requestId: 'error-test-123',
						processingTime: expect.any(Number),
						originalError: expect.any(Error),
					}),
				);
			}
		});
	});

	describe('Event Emissions', () => {
		beforeEach(async () => {
			await serviceBridge.initialize();
		});

		it('should emit events for successful operations', async () => {
			const embeddingEvents: any[] = [];
			const chatEvents: any[] = [];

			serviceBridge.on('embedding-generated', (event) => embeddingEvents.push(event));
			serviceBridge.on('chat-generated', (event) => chatEvents.push(event));

			await serviceBridge.generateEmbedding({ text: 'test embedding' });
			await serviceBridge.generateChat({
				messages: [{ role: 'user', content: 'test chat' }],
			});

			expect(embeddingEvents).toHaveLength(1);
			expect(chatEvents).toHaveLength(1);

			expect(embeddingEvents[0]).toEqual(
				expect.objectContaining({
					requestId: expect.any(String),
					processingTime: expect.any(Number),
					model: expect.any(String),
				}),
			);

			expect(chatEvents[0]).toEqual(
				expect.objectContaining({
					requestId: expect.any(String),
					processingTime: expect.any(Number),
					model: expect.any(String),
					messageCount: 1,
				}),
			);
		});

		it('should emit events for failed operations', async () => {
			const failedEvents: any[] = [];

			serviceBridge.on('embedding-failed', (event) => failedEvents.push(event));
			serviceBridge.on('chat-failed', (event) => failedEvents.push(event));

			mockAdapter.setShouldFail(true);

			try {
				await serviceBridge.generateEmbedding({ text: 'test' });
			} catch {
				// Expected failure
			}

			try {
				await serviceBridge.generateChat({
					messages: [{ role: 'user', content: 'test' }],
				});
			} catch {
				// Expected failure
			}

			expect(failedEvents).toHaveLength(2);

			failedEvents.forEach((event) => {
				expect(event).toEqual(
					expect.objectContaining({
						requestId: expect.any(String),
						error: expect.any(String),
						processingTime: expect.any(Number),
					}),
				);
			});
		});
	});
});
