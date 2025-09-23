/**
 * Composite Provider Test Suite
 * Tests the unified model provider with fallback capabilities
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CompositeModelProvider, createCompositeProvider } from '../composite-provider';
import { CircuitBreaker } from '../../lib/circuit-breaker';

// Mock model selection functions
vi.mock('../../lib/model-selection', () => ({
	selectMLXModel: vi.fn().mockResolvedValue('mlx-test-model'),
	selectOllamaModel: vi.fn().mockResolvedValue('llama3.2:3b'),
	selectFrontierModel: vi.fn().mockResolvedValue('gpt-4o-mini'),
}));

// Mock provider implementations
const createMockProvider = (name: string, available = true) => ({
	name,
	isAvailable: vi.fn().mockResolvedValue(available),
	executeEmbeddings: vi.fn().mockResolvedValue({
		embeddings: [[0.1, 0.2, 0.3]],
		model: `${name}-model`,
		provider: name,
		processingTime: 100,
	}),
	executeChat: vi.fn().mockResolvedValue({
		content: `${name} response`,
		model: `${name}-model`,
		provider: name,
		processingTime: 200,
	}),
	executeRerank: vi.fn().mockResolvedValue({
		scores: [0.9, 0.8, 0.7],
		model: `${name}-model`,
		provider: name,
		processingTime: 150,
	}),
});

describe('CompositeModelProvider', () => {
	let compositeProvider: CompositeModelProvider;
	let mockMLXService: any;
	let mockEventEmitter: any;

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		mockMLXService = {
			isAvailable: vi.fn().mockResolvedValue(true),
			generateEmbedding: vi.fn().mockResolvedValue({
				embedding: [0.1, 0.2, 0.3],
				model: 'mlx-test',
			}),
			generateChat: vi.fn().mockResolvedValue({
				content: 'MLX response',
				model: 'mlx-test',
			}),
			rerank: vi.fn().mockResolvedValue({
				scores: [0.9, 0.8, 0.7],
				model: 'mlx-test',
			}),
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Provider Initialization', () => {
		it('should initialize with MLX provider when enabled', () => {
			const config = {
				mlx: { enabled: true, service: mockMLXService, priority: 1 },
				ollama: { enabled: false },
				openai: { enabled: false },
			};

			compositeProvider = createCompositeProvider(config);
			const providers = compositeProvider.getProviders();

			expect(providers).toHaveLength(1);
			expect(providers[0].name).toBe('mlx');
		});

		it('should initialize with multiple providers in priority order', () => {
			const config = {
				mlx: { enabled: true, service: mockMLXService, priority: 2 },
				ollama: { enabled: true, priority: 1 },
				openai: { enabled: false },
			};

			compositeProvider = createCompositeProvider(config);
			const providers = compositeProvider.getProviders();

			expect(providers).toHaveLength(2);
			expect(providers[0].name).toBe('ollama'); // Lower priority number first
			expect(providers[1].name).toBe('mlx');
		});

		it('should skip disabled providers', () => {
			const config = {
				mlx: { enabled: false },
				ollama: { enabled: false },
				openai: { enabled: false },
			};

			compositeProvider = createCompositeProvider(config);
			const providers = compositeProvider.getProviders();

			expect(providers).toHaveLength(0);
		});
	});

	describe('Health Checks', () => {
		it('should report healthy when at least one provider is available', async () => {
			const config = {
				mlx: { enabled: true, service: mockMLXService, priority: 1 },
				ollama: { enabled: true, priority: 2 },
			};

			compositeProvider = createCompositeProvider(config);
			const health = await compositeProvider.healthCheck();

			expect(health.healthy).toBe(true);
			expect(health.providers).toHaveLength(2);
			expect(health.providers[0].available).toBe(true);
		});

		it('should report unhealthy when all providers are unavailable', async () => {
			// Mock model selection to return null (unavailable)
			const { selectMLXModel, selectOllamaModel } = await import('../../lib/model-selection');
			vi.mocked(selectMLXModel).mockResolvedValue(null);
			vi.mocked(selectOllamaModel).mockResolvedValue(null);

			const config = {
				mlx: { enabled: true, service: mockMLXService, priority: 1 },
				ollama: { enabled: true, priority: 2 },
			};

			compositeProvider = createCompositeProvider(config);
			const health = await compositeProvider.healthCheck();

			expect(health.healthy).toBe(false);
			expect(health.providers.every((p) => !p.available)).toBe(true);
		});

		it('should handle provider health check errors gracefully', async () => {
			// Mock model selection to throw an error
			const { selectMLXModel } = await import('../../lib/model-selection');
			vi.mocked(selectMLXModel).mockRejectedValue(new Error('Health check failed'));

			const config = {
				mlx: { enabled: true, service: mockMLXService, priority: 1 },
			};

			compositeProvider = createCompositeProvider(config);
			const health = await compositeProvider.healthCheck();

			expect(health.healthy).toBe(false);
			expect(health.providers[0].available).toBe(false);
		});
	});

	describe('Embedding Generation', () => {
		it('should generate embeddings using the first available provider', async () => {
			const config = {
				mlx: { enabled: true, service: mockMLXService, priority: 1 },
			};

			compositeProvider = createCompositeProvider(config);
			const result = await compositeProvider.generateEmbeddings({
				texts: ['Hello world'],
			});

			expect(result.embeddings).toHaveLength(1);
			expect(result.provider).toBe('mlx');
			expect(mockMLXService.generateEmbedding).toHaveBeenCalledWith({
				text: 'Hello world',
				model: undefined,
			});
		});

		it('should validate embedding request schema', async () => {
			const config = {
				mlx: { enabled: true, service: mockMLXService, priority: 1 },
			};

			compositeProvider = createCompositeProvider(config);

			await expect(
				compositeProvider.generateEmbeddings({
					texts: [], // Invalid: empty array
				} as any),
			).rejects.toThrow();
		});
	});

	describe('Chat Generation', () => {
		it('should generate chat response with default parameters', async () => {
			const config = {
				mlx: { enabled: true, service: mockMLXService, priority: 1 },
			};

			compositeProvider = createCompositeProvider(config);
			const result = await compositeProvider.generateChat({
				messages: [{ role: 'user', content: 'Hello' }],
			});

			expect(result.content).toBe('MLX response');
			expect(result.provider).toBe('mlx');
			expect(mockMLXService.generateChat).toHaveBeenCalledWith({
				messages: [{ role: 'user', content: 'Hello' }],
				model: undefined,
				max_tokens: undefined,
				temperature: undefined,
			});
		});

		it('should pass through all chat parameters', async () => {
			const config = {
				mlx: { enabled: true, service: mockMLXService, priority: 1 },
			};

			compositeProvider = createCompositeProvider(config);
			const request = {
				messages: [
					{ role: 'system', content: 'You are helpful' },
					{ role: 'user', content: 'Hello' },
				],
				model: 'custom-model',
				task: 'code' as const,
				maxTokens: 1000,
				temperature: 0.5,
			};

			await compositeProvider.generateChat(request);

			expect(mockMLXService.generateChat).toHaveBeenCalledWith({
				messages: request.messages,
				model: request.model,
				max_tokens: request.maxTokens,
				temperature: request.temperature,
			});
		});
	});

	describe('Event Emission', () => {
		it('should emit events for successful operations', async () => {
			const config = {
				mlx: { enabled: true, service: mockMLXService, priority: 1 },
			};

			compositeProvider = createCompositeProvider(config);
			const emitSpy = vi.spyOn(compositeProvider, 'emit');

			await compositeProvider.generateEmbeddings({
				texts: ['test'],
			});

			expect(emitSpy).toHaveBeenCalledWith('embeddings-generated', expect.objectContaining({
				provider: 'mlx',
				attempts: 1,
				textCount: 1,
			}));

			await compositeProvider.generateChat({
				messages: [{ role: 'user', content: 'test' }],
			});

			expect(emitSpy).toHaveBeenCalledWith('chat-generated', expect.objectContaining({
				provider: 'mlx',
				attempts: 1,
				messageCount: 1,
			}));
		});
	});

	describe('Reranking', () => {
		it('should rerank documents using supporting providers', async () => {
			const config = {
				mlx: { enabled: true, service: mockMLXService, priority: 1 },
			};

			compositeProvider = createCompositeProvider(config);
			const result = await compositeProvider.rerank({
				query: 'test query',
				documents: ['doc1', 'doc2', 'doc3'],
			});

			expect(result.scores).toEqual([0.9, 0.8, 0.7]);
			expect(result.provider).toBe('mlx');
			expect(mockMLXService.rerank).toHaveBeenCalledWith('test query', ['doc1', 'doc2', 'doc3'], undefined);
		});
	});
});