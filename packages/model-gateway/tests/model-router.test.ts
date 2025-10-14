/**
 * @file tests/model-router.test.ts
 * @description Comprehensive tests for ModelRouter with MLX, Ollama, and Frontier API fallbacks
 */

import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { MLXAdapter } from '../src/adapters/mlx-adapter.js';
import { OllamaAdapter } from '../src/adapters/ollama-adapter.js';
import { ModelRouter } from '../src/model-router.js';

// Mock the adapters
vi.mock('../src/adapters/mlx-adapter');
vi.mock('../src/adapters/ollama-adapter');

describe('ModelRouter', () => {
	let modelRouter: ModelRouter;
	let mockMLXAdapter: MLXAdapter;
	let mockOllamaAdapter: OllamaAdapter;

	beforeEach(() => {
		mockMLXAdapter = new MLXAdapter();
		mockOllamaAdapter = new OllamaAdapter();

		modelRouter = new ModelRouter(mockMLXAdapter, mockOllamaAdapter);
	});

	describe('initialization', () => {
		it('should initialize with available models', async () => {
			(mockMLXAdapter.isAvailable as Mock).mockResolvedValue(true);
			(mockOllamaAdapter.isAvailable as Mock).mockResolvedValue(true);
			(mockOllamaAdapter.listModels as Mock).mockResolvedValue(['llama2', 'llama3']);

			await modelRouter.initialize();

			expect(modelRouter.hasCapability('embedding')).toBe(true);
			expect(modelRouter.hasCapability('chat')).toBe(true);
		});

		it('should handle MLX unavailable gracefully', async () => {
			(mockMLXAdapter.isAvailable as Mock).mockResolvedValue(false);
			(mockOllamaAdapter.isAvailable as Mock).mockResolvedValue(true);
			(mockOllamaAdapter.listModels as Mock).mockResolvedValue(['llama2']);

			await modelRouter.initialize();

			expect(modelRouter.hasCapability('embedding')).toBe(true);
			expect(modelRouter.hasCapability('chat')).toBe(true);
		});
	});

	describe('embedding generation', () => {
		beforeEach(async () => {
			(mockMLXAdapter.isAvailable as Mock).mockResolvedValue(true);
			(mockOllamaAdapter.isAvailable as Mock).mockResolvedValue(true);
			(mockOllamaAdapter.listModels as Mock).mockResolvedValue(['llama2']);

			await modelRouter.initialize();
		});

		it('should generate embeddings with MLX as primary', async () => {
			const mockEmbedding = {
				embedding: [0.1, 0.2, 0.3],
				model: 'qwen3-embedding-4b-mlx',
			};
			(mockMLXAdapter.generateEmbedding as Mock).mockResolvedValue(mockEmbedding);

			const result = await modelRouter.generateEmbedding({ text: 'test text' });

			expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
			expect(result.model).toBe('qwen3-embedding-4b-mlx');
		});

		it('should fallback to Ollama when MLX fails', async () => {
			(mockMLXAdapter.generateEmbedding as Mock).mockRejectedValue(new Error('MLX failed'));
			const mockEmbedding = { embedding: [0.4, 0.5, 0.6] };
			(mockOllamaAdapter.generateEmbedding as Mock).mockResolvedValue(mockEmbedding);

			const result = await modelRouter.generateEmbedding({ text: 'test text' });

			expect(result.embedding).toEqual([0.4, 0.5, 0.6]);
			expect(result.model).toBe('nomic-embed-text');
		});

		it('should throw error when all local models fail', async () => {
			(mockMLXAdapter.generateEmbedding as Mock).mockRejectedValue(new Error('MLX failed'));
			(mockOllamaAdapter.generateEmbedding as Mock).mockRejectedValue(new Error('Ollama failed'));

			await expect(modelRouter.generateEmbedding({ text: 'test text' })).rejects.toThrow(
				'All embedding models failed',
			);
		});

		it('should handle batch embeddings', async () => {
			const mockEmbeddings = [{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }];
			(mockMLXAdapter.generateEmbeddings as Mock).mockResolvedValue(mockEmbeddings);

			const result = await modelRouter.generateEmbeddings({
				texts: ['text1', 'text2'],
			});

			expect(result.embeddings).toEqual([
				[0.1, 0.2],
				[0.3, 0.4],
			]);
			expect(result.model).toBe('qwen3-embedding-4b-mlx');
		});
	});

	describe('chat generation', () => {
		beforeEach(async () => {
			(mockMLXAdapter.isAvailable as Mock).mockResolvedValue(false);
			(mockOllamaAdapter.isAvailable as Mock).mockResolvedValue(true);
			(mockOllamaAdapter.listModels as Mock).mockResolvedValue(['llama2']);

			await modelRouter.initialize();
		});

		it('should generate chat with Ollama as primary', async () => {
			const mockResponse = { content: 'Hello!', model: 'llama2' };
			(mockOllamaAdapter.generateChat as Mock).mockResolvedValue(mockResponse);

			const result = await modelRouter.generateChat({
				messages: [{ role: 'user', content: 'Hello' }],
			});

			expect(result.content).toBe('Hello!');
			expect(result.model).toBe('llama2');
		});

		it('should throw error when Ollama fails', async () => {
			(mockOllamaAdapter.generateChat as Mock).mockRejectedValue(new Error('Ollama failed'));

			await expect(
				modelRouter.generateChat({
					messages: [{ role: 'user', content: 'Hello' }],
				}),
			).rejects.toThrow('All chat models failed');
		});

		it('should throw error when all chat models fail', async () => {
			(mockOllamaAdapter.generateChat as Mock).mockRejectedValue(new Error('Ollama failed'));

			await expect(
				modelRouter.generateChat({
					messages: [{ role: 'user', content: 'Hello' }],
				}),
			).rejects.toThrow('All chat models failed');
		});
	});

	describe('model selection', () => {
		it('should select highest priority model', async () => {
			(mockMLXAdapter.isAvailable as Mock).mockResolvedValue(true);
			(mockOllamaAdapter.isAvailable as Mock).mockResolvedValue(true);
			(mockOllamaAdapter.listModels as Mock).mockResolvedValue(['llama2']);

			await modelRouter.initialize();

			const embeddingModels = modelRouter.getAvailableModels('embedding');
			expect(embeddingModels[0].name).toBe('qwen3-embedding-4b-mlx'); // Highest priority (100)
			expect(embeddingModels[0].priority).toBe(100);
		});

		it('should respect user-specified model if available', async () => {
			(mockMLXAdapter.isAvailable as Mock).mockResolvedValue(true);
			(mockOllamaAdapter.isAvailable as Mock).mockResolvedValue(true);
			(mockOllamaAdapter.listModels as Mock).mockResolvedValue(['llama2']);

			await modelRouter.initialize();

			const mockEmbedding = {
				embedding: [0.1, 0.2, 0.3],
				model: 'qwen3-embedding-8b-mlx',
			};
			(mockMLXAdapter.generateEmbedding as Mock).mockResolvedValue(mockEmbedding);

			const result = await modelRouter.generateEmbedding({
				text: 'test',
				model: 'qwen3-embedding-8b-mlx',
			});

			expect(result.model).toBe('qwen3-embedding-8b-mlx');
		});
	});

	describe('error handling', () => {
		it('should throw appropriate error when no models available', async () => {
			(mockMLXAdapter.isAvailable as Mock).mockResolvedValue(false);
			(mockOllamaAdapter.isAvailable as Mock).mockResolvedValue(false);
			(mockOllamaAdapter.listModels as Mock).mockResolvedValue([]);

			await modelRouter.initialize();

			await expect(modelRouter.generateEmbedding({ text: 'test' })).rejects.toThrow(
				'No embedding models available',
			);
		});

		it('should provide detailed error information', async () => {
			(mockMLXAdapter.isAvailable as Mock).mockResolvedValue(true);
			(mockOllamaAdapter.isAvailable as Mock).mockResolvedValue(false);
			(mockOllamaAdapter.listModels as Mock).mockResolvedValue([]);

			await modelRouter.initialize();

			const detailedError = new Error('MLX connection timeout');
			(mockMLXAdapter.generateEmbedding as Mock).mockRejectedValue(detailedError);

			await expect(modelRouter.generateEmbedding({ text: 'test' })).rejects.toThrow(
				'All embedding models failed',
			);
		});
	});

	describe('reranking', () => {
		beforeEach(async () => {
			(mockMLXAdapter.isAvailable as Mock).mockResolvedValue(false);
			(mockOllamaAdapter.isAvailable as Mock).mockResolvedValue(true);
			(mockOllamaAdapter.listModels as Mock).mockResolvedValue(['llama2']);

			await modelRouter.initialize();
		});

		it('should rerank documents using Ollama', async () => {
			const mockRerank = { scores: [0.8, 0.6, 0.9] };
			(mockOllamaAdapter.rerank as Mock).mockResolvedValue(mockRerank);

			const result = await modelRouter.rerank({
				query: 'test query',
				documents: ['doc1', 'doc2', 'doc3'],
			});

			expect(result.scores).toEqual([0.8, 0.6, 0.9]);
		});
	});

	describe('tri-band chat generation', () => {
		beforeEach(async () => {
			(mockMLXAdapter.isAvailable as Mock).mockResolvedValue(true);
			(mockOllamaAdapter.isAvailable as Mock).mockResolvedValue(true);
			(mockOllamaAdapter.listModels as Mock).mockResolvedValue(['llama2']);

			await modelRouter.initialize();
		});

		it('should use MLX for tri-band chat when available', async () => {
			const mockTriBandResponse = {
				content: 'Response with tri-band context',
				model: 'qwen3-coder-30b-mlx',
				bandUsage: {
					bandAChars: 500,
					bandBVirtualTokens: 25,
					bandCFacts: 3
				},
				virtualTokenMode: 'pass-through',
				structuredFactsProcessed: true
			};
			(mockMLXAdapter.generateChatWithBands as Mock).mockResolvedValue(mockTriBandResponse);

			const result = await modelRouter.generateChatWithBands({
				messages: [{ role: 'user', content: 'Hello with context' }],
				triBandContext: {
					bandA: 'Full text context here',
					bandB: [0.1, 0.2, 0.3, 0.4, 0.5],
					bandC: [
						{
							type: 'number',
							value: 42,
							context: 'test fact',
							confidence: 0.95
						}
					],
					virtualTokenMode: 'pass-through',
					enableStructuredOutput: true
				}
			});

			expect(mockMLXAdapter.generateChatWithBands).toHaveBeenCalledWith({
				messages: [{ role: 'user', content: 'Hello with context' }],
				model: undefined,
				bandA: 'Full text context here',
				bandB: [0.1, 0.2, 0.3, 0.4, 0.5],
				bandC: [
					{
						type: 'number',
						value: 42,
						context: 'test fact',
						confidence: 0.95
					}
				],
				virtualTokenMode: 'pass-through',
				enableStructuredOutput: true,
				max_tokens: undefined,
				temperature: undefined
			});

			expect(result.content).toBe('Response with tri-band context');
			expect(result.model).toBe('qwen3-coder-30b-mlx');
			expect(result.bandUsage).toBeDefined();
			expect(result.virtualTokenMode).toBe('pass-through');
			expect(result.structuredFactsProcessed).toBe(true);
		});

		it('should fall back to standard chat for non-MLX models', async () => {
			// Mock MLX as unavailable
			(mockMLXAdapter.isAvailable as Mock).mockResolvedValue(false);
			await modelRouter.initialize();

			const mockStandardResponse = { content: 'Standard response', model: 'llama2' };
			(mockOllamaAdapter.generateChat as Mock).mockResolvedValue(mockStandardResponse);

			const result = await modelRouter.generateChatWithBands({
				messages: [{ role: 'user', content: 'Hello' }],
				triBandContext: {
					bandA: 'Some context',
					bandC: [{ type: 'fact', value: 'test', context: 'demo', confidence: 0.8 }]
				}
			});

			// Should have enhanced the message with tri-band context
			expect(mockOllamaAdapter.generateChat).toHaveBeenCalledWith({
				messages: expect.arrayContaining([
					expect.objectContaining({
						role: 'user',
						content: expect.stringContaining('Some context')
					})
				]),
				model: undefined,
				max_tokens: undefined,
				temperature: undefined
			});

			expect(result.content).toBe('Standard response');
			expect(result.model).toBe('llama2');
		});

		it('should fall back to standard chat when MLX tri-band fails', async () => {
			const mockStandardResponse = { content: 'Fallback response', model: 'qwen3-coder-30b-mlx' };
			(mockMLXAdapter.generateChatWithBands as Mock).mockRejectedValue(new Error('Tri-band failed'));
			(mockMLXAdapter.generateChat as Mock).mockResolvedValue(mockStandardResponse);

			const result = await modelRouter.generateChatWithBands({
				messages: [{ role: 'user', content: 'Hello' }],
				triBandContext: {
					bandA: 'Context that will fail'
				}
			});

			expect(mockMLXAdapter.generateChatWithBands).toHaveBeenCalled();
			expect(mockMLXAdapter.generateChat).toHaveBeenCalledWith({
				messages: [{ role: 'user', content: 'Hello' }],
				model: undefined,
				max_tokens: undefined,
				temperature: undefined
			});

			expect(result.content).toBe('Fallback response');
		});

		it('should handle requests without tri-band context', async () => {
			const mockStandardResponse = { content: 'Standard response', model: 'qwen3-coder-30b-mlx' };
			(mockMLXAdapter.generateChat as Mock).mockResolvedValue(mockStandardResponse);

			const result = await modelRouter.generateChatWithBands({
				messages: [{ role: 'user', content: 'Hello' }]
				// No triBandContext
			});

			expect(mockMLXAdapter.generateChat).toHaveBeenCalledWith({
				messages: [{ role: 'user', content: 'Hello' }],
				model: undefined,
				max_tokens: undefined,
				temperature: undefined
			});

			expect(result.content).toBe('Standard response');
		});

		it('should enhance messages with tri-band context for non-MLX models', async () => {
			(mockMLXAdapter.isAvailable as Mock).mockResolvedValue(false);
			await modelRouter.initialize();

			const mockStandardResponse = { content: 'Enhanced response', model: 'llama2' };
			(mockOllamaAdapter.generateChat as Mock).mockResolvedValue(mockStandardResponse);

			await modelRouter.generateChatWithBands({
				messages: [
					{ role: 'system', content: 'You are a helpful assistant.' },
					{ role: 'user', content: 'What is the capital?' }
				],
				triBandContext: {
					bandA: 'Paris is the capital of France.',
					bandC: [
						{ type: 'location', value: 'Paris', context: 'capital of France', confidence: 0.95 },
						{ type: 'number', value: 2024, context: 'current year', confidence: 1.0 }
					]
				}
			});

			const enhancedMessage = (mockOllamaAdapter.generateChat as Mock).mock.calls[0][0].messages[1];
			expect(enhancedMessage.content).toContain('Paris is the capital of France.');
			expect(enhancedMessage.content).toContain('Key Facts:');
			expect(enhancedMessage.content).toContain('location: Paris');
			expect(enhancedMessage.content).toContain('number: 2024');
			expect(enhancedMessage.content).toContain('comprehensive answer');
		});

		it('should handle empty tri-band context gracefully', async () => {
			const mockStandardResponse = { content: 'Response', model: 'qwen3-coder-30b-mlx' };
			(mockMLXAdapter.generateChatWithBands as Mock).mockResolvedValue(mockStandardResponse);

			const result = await modelRouter.generateChatWithBands({
				messages: [{ role: 'user', content: 'Hello' }],
				triBandContext: {
					// Empty bands
					bandA: '',
					bandB: [],
					bandC: []
				}
			});

			expect(result.content).toBe('Response');
		});

		it('should validate virtual token mode parameter', async () => {
			const mockResponse = { content: 'Response', model: 'qwen3-coder-30b-mlx', bandUsage: {}, virtualTokenMode: 'decode' };
			(mockMLXAdapter.generateChatWithBands as Mock).mockResolvedValue(mockResponse);

			await modelRouter.generateChatWithBands({
				messages: [{ role: 'user', content: 'Hello' }],
				triBandContext: {
					bandB: [0.1, 0.2, 0.3],
					virtualTokenMode: 'decode'
				}
			});

			expect(mockMLXAdapter.generateChatWithBands).toHaveBeenCalledWith(
				expect.objectContaining({
					triBandContext: expect.objectContaining({
						virtualTokenMode: 'decode'
					})
				})
			);
		});

		it('should handle structured output parameter', async () => {
			const mockResponse = {
				content: 'Structured response',
				model: 'qwen3-coder-30b-mlx',
				bandUsage: {},
				virtualTokenMode: 'pass-through',
				structuredFactsProcessed: true
			};
			(mockMLXAdapter.generateChatWithBands as Mock).mockResolvedValue(mockResponse);

			const result = await modelRouter.generateChatWithBands({
				messages: [{ role: 'user', content: 'Hello' }],
				triBandContext: {
					bandC: [{ type: 'fact', value: 'test', context: 'demo', confidence: 0.9 }],
					enableStructuredOutput: true
				}
			});

			expect(mockMLXAdapter.generateChatWithBands).toHaveBeenCalledWith(
				expect.objectContaining({
					triBandContext: expect.objectContaining({
						enableStructuredOutput: true
					})
				})
			);

			expect(result.structuredFactsProcessed).toBe(true);
		});
	});

	describe('privacy mode integration', () => {
		it('should respect privacy mode for tri-band requests', async () => {
			modelRouter.setPrivacyMode(true);

			const mockStandardResponse = { content: 'Privacy mode response', model: 'qwen3-coder-30b-mlx' };
			(mockMLXAdapter.generateChatWithBands as Mock).mockResolvedValue(mockStandardResponse);

			const result = await modelRouter.generateChatWithBands({
				messages: [{ role: 'user', content: 'Hello' }],
				triBandContext: {
					bandA: 'Sensitive context'
				}
			});

			// Should still work with MLX in privacy mode
			expect(result.content).toBe('Privacy mode response');
			expect(modelRouter.isPrivacyModeEnabled()).toBe(true);
		});

		it('should prefer MLX models in privacy mode', async () => {
			modelRouter.setPrivacyMode(true);

			const mockResponse = { content: 'Private MLX response', model: 'qwen3-coder-30b-mlx' };
			(mockMLXAdapter.generateChatWithBands as Mock).mockResolvedValue(mockResponse);

			const result = await modelRouter.generateChatWithBands({
				messages: [{ role: 'user', content: 'Hello' }],
				triBandContext: { bandA: 'Context' }
			});

			expect(mockMLXAdapter.generateChatWithBands).toHaveBeenCalled();
			expect(result.model).toBe('qwen3-coder-30b-mlx');
		});
	});
});
