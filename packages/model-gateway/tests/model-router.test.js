/**
 * @file tests/model-router.test.ts
 * @description Comprehensive tests for ModelRouter with MLX, Ollama, and Frontier API fallbacks
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MLXAdapter } from '../src/adapters/mlx-adapter';
import { OllamaAdapter } from '../src/adapters/ollama-adapter';
import { ModelRouter } from '../src/model-router';

// Mock the adapters
vi.mock('../src/adapters/mlx-adapter');
vi.mock('../src/adapters/ollama-adapter');
describe('ModelRouter', () => {
	let modelRouter;
	let mockMLXAdapter;
	let mockOllamaAdapter;
	beforeEach(() => {
		mockMLXAdapter = new MLXAdapter();
		mockOllamaAdapter = new OllamaAdapter();
		modelRouter = new ModelRouter(mockMLXAdapter, mockOllamaAdapter);
	});
	describe('initialization', () => {
		it('should initialize with available models', async () => {
			mockMLXAdapter.isAvailable.mockResolvedValue(true);
			mockOllamaAdapter.isAvailable.mockResolvedValue(true);
			mockOllamaAdapter.listModels.mockResolvedValue(['llama2', 'llama3']);
			await modelRouter.initialize();
			expect(modelRouter.hasCapability('embedding')).toBe(true);
			expect(modelRouter.hasCapability('chat')).toBe(true);
		});
		it('should handle MLX unavailable gracefully', async () => {
			mockMLXAdapter.isAvailable.mockResolvedValue(false);
			mockOllamaAdapter.isAvailable.mockResolvedValue(true);
			mockOllamaAdapter.listModels.mockResolvedValue(['llama2']);
			await modelRouter.initialize();
			expect(modelRouter.hasCapability('embedding')).toBe(true);
			expect(modelRouter.hasCapability('chat')).toBe(true);
		});
	});
	describe('embedding generation', () => {
		beforeEach(async () => {
			mockMLXAdapter.isAvailable.mockResolvedValue(true);
			mockOllamaAdapter.isAvailable.mockResolvedValue(true);
			mockOllamaAdapter.listModels.mockResolvedValue(['llama2']);
			await modelRouter.initialize();
		});
		it('should generate embeddings with MLX as primary', async () => {
			const mockEmbedding = {
				embedding: [0.1, 0.2, 0.3],
				model: 'qwen3-embedding-4b-mlx',
				vector: [0.1, 0.2, 0.3],
			};
			mockMLXAdapter.generateEmbedding.mockResolvedValue(mockEmbedding);
			const result = await modelRouter.generateEmbedding({ text: 'test text' });
			expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
			expect(result.model).toBe('qwen3-embedding-4b-mlx');
		});
		it('should fallback to Ollama when MLX fails', async () => {
			mockMLXAdapter.generateEmbedding.mockRejectedValue(new Error('MLX failed'));
			const mockEmbedding = { embedding: [0.4, 0.5, 0.6], vector: [0.4, 0.5, 0.6] };
			mockOllamaAdapter.generateEmbedding.mockResolvedValue(mockEmbedding);
			const result = await modelRouter.generateEmbedding({ text: 'test text' });
			expect(result.embedding).toEqual([0.4, 0.5, 0.6]);
			expect(result.model).toBe('nomic-embed-text');
		});
		it('should throw error when all local models fail', async () => {
			mockMLXAdapter.generateEmbedding.mockRejectedValue(new Error('MLX failed'));
			mockOllamaAdapter.generateEmbedding.mockRejectedValue(new Error('Ollama failed'));
			await expect(modelRouter.generateEmbedding({ text: 'test text' })).rejects.toThrow(
				'All embedding models failed',
			);
		});
		it('should handle batch embeddings', async () => {
			const mockEmbeddings = [{ embedding: [0.1, 0.2], vector: [0.1, 0.2] }, { embedding: [0.3, 0.4], vector: [0.3, 0.4] }];
			mockMLXAdapter.generateEmbeddings.mockResolvedValue(mockEmbeddings);
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
			mockMLXAdapter.isAvailable.mockResolvedValue(false);
			mockOllamaAdapter.isAvailable.mockResolvedValue(true);
			mockOllamaAdapter.listModels.mockResolvedValue(['llama2']);
			await modelRouter.initialize();
		});
		it('should generate chat with Ollama as primary', async () => {
			const mockResponse = { content: 'Hello!', model: 'llama2' };
			mockOllamaAdapter.generateChat.mockResolvedValue(mockResponse);
			const result = await modelRouter.generateChat({
				messages: [{ role: 'user', content: 'Hello' }],
			});
			expect(result.content).toBe('Hello!');
			expect(result.model).toBe('llama2');
		});
		it('should throw error when Ollama fails', async () => {
			mockOllamaAdapter.generateChat.mockRejectedValue(new Error('Ollama failed'));
			await expect(
				modelRouter.generateChat({
					messages: [{ role: 'user', content: 'Hello' }],
				}),
			).rejects.toThrow('All chat models failed');
		});
		it('should throw error when all chat models fail', async () => {
			mockOllamaAdapter.generateChat.mockRejectedValue(new Error('Ollama failed'));
			await expect(
				modelRouter.generateChat({
					messages: [{ role: 'user', content: 'Hello' }],
				}),
			).rejects.toThrow('All chat models failed');
		});
	});
	describe('model selection', () => {
		it('should select highest priority model', async () => {
			mockMLXAdapter.isAvailable.mockResolvedValue(true);
			mockOllamaAdapter.isAvailable.mockResolvedValue(true);
			mockOllamaAdapter.listModels.mockResolvedValue(['llama2']);
			await modelRouter.initialize();
			const embeddingModels = modelRouter.getAvailableModels('embedding');
			expect(embeddingModels[0].name).toBe('qwen3-embedding-4b-mlx'); // Highest priority (100)
			expect(embeddingModels[0].priority).toBe(100);
		});
		it('should respect user-specified model if available', async () => {
			mockMLXAdapter.isAvailable.mockResolvedValue(true);
			mockOllamaAdapter.isAvailable.mockResolvedValue(true);
			mockOllamaAdapter.listModels.mockResolvedValue(['llama2']);
			await modelRouter.initialize();
			const mockEmbedding = {
				embedding: [0.1, 0.2, 0.3],
				model: 'qwen3-embedding-8b-mlx',
			};
			mockMLXAdapter.generateEmbedding.mockResolvedValue(mockEmbedding);
			const result = await modelRouter.generateEmbedding({
				text: 'test',
				model: 'qwen3-embedding-8b-mlx',
			});
			expect(result.model).toBe('qwen3-embedding-8b-mlx');
		});
	});
	describe('error handling', () => {
		it('should throw appropriate error when no models available', async () => {
			mockMLXAdapter.isAvailable.mockResolvedValue(false);
			mockOllamaAdapter.isAvailable.mockResolvedValue(false);
			mockOllamaAdapter.listModels.mockResolvedValue([]);
			await modelRouter.initialize();
			await expect(modelRouter.generateEmbedding({ text: 'test' })).rejects.toThrow(
				'No embedding models available',
			);
		});
		it('should provide detailed error information', async () => {
			mockMLXAdapter.isAvailable.mockResolvedValue(true);
			mockOllamaAdapter.isAvailable.mockResolvedValue(false);
			mockOllamaAdapter.listModels.mockResolvedValue([]);
			await modelRouter.initialize();
			const detailedError = new Error('MLX connection timeout');
			mockMLXAdapter.generateEmbedding.mockRejectedValue(detailedError);
			await expect(modelRouter.generateEmbedding({ text: 'test' })).rejects.toThrow(
				'All embedding models failed',
			);
		});
	});
	describe('reranking', () => {
		beforeEach(async () => {
			mockMLXAdapter.isAvailable.mockResolvedValue(false);
			mockOllamaAdapter.isAvailable.mockResolvedValue(true);
			mockOllamaAdapter.listModels.mockResolvedValue(['llama2']);
			await modelRouter.initialize();
		});
		it('should rerank documents using Ollama', async () => {
			const mockRerank = { scores: [0.8, 0.6, 0.9] };
			mockOllamaAdapter.rerank.mockResolvedValue(mockRerank);
			const result = await modelRouter.rerank({
				query: 'test query',
				documents: ['doc1', 'doc2', 'doc3'],
			});
			expect(result.scores).toEqual([0.8, 0.6, 0.9]);
		});
	});
});
//# sourceMappingURL=model-router.test.js.map
