/**
 * Composite Provider Test Suite
 * Tests the unified model provider with fallback capabilities
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	type ChatRequest,
	type CompositeModelProvider,
	createCompositeProvider,
} from '../composite-provider.js';

// Mock model selection functions
vi.mock('../../lib/model-selection', () => ({
	selectMLXModel: vi.fn().mockResolvedValue('mlx-test-model'),
	selectOllamaModel: vi.fn().mockResolvedValue('llama3.2:3b'),
	selectFrontierModel: vi.fn().mockResolvedValue('gpt-4o-mini'),
}));

// Mock provider implementations
const _createMockProvider = (name: string, available = true) => ({
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

const captureEvents = (
	emitter: CompositeModelProvider,
	names: Array<'provider-failed' | 'provider-success' | 'provider-skipped' | 'chat-generated'>,
) => {
	const buckets: Record<string, Array<Record<string, unknown>>> = {};
	for (const name of names) {
		buckets[name] = [];
		emitter.on(name, (payload: Record<string, unknown>) => {
			const bucket = buckets[name];
			if (bucket) {
				bucket.push(payload);
			}
		});
	}
	return buckets;
};

const getEvents = (
	events: Record<string, Array<Record<string, unknown>>>,
	name: 'provider-failed' | 'provider-success' | 'provider-skipped' | 'chat-generated',
) => events[name] ?? [];

const mockFetchSuccess = (payload: Record<string, unknown>) =>
	vi.spyOn(globalThis, 'fetch').mockImplementation(
		async () =>
			new Response(JSON.stringify(payload), {
				headers: { 'Content-Type': 'application/json' },
				status: 200,
			}),
	);

const createMockMLXService = () => ({
	isAvailable: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
	generateEmbedding: vi
		.fn<
			(args: { text: string; model?: string }) => Promise<{ embedding: number[]; model: string }>
		>()
		.mockResolvedValue({
			embedding: [0.1, 0.2, 0.3],
			model: 'mlx-test',
		}),
	generateChat: vi
		.fn<
			(args: {
				messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
				model?: string;
				max_tokens?: number;
				temperature?: number;
			}) => Promise<{ content: string; model: string }>
		>()
		.mockResolvedValue({
			content: 'MLX response',
			model: 'mlx-test',
		}),
	rerank: vi
		.fn<
			(
				query: string,
				documents: string[],
				model?: string,
			) => Promise<{ scores: number[]; model: string }>
		>()
		.mockResolvedValue({
			scores: [0.9, 0.8, 0.7],
			model: 'mlx-test',
		}),
});

type MockMLXService = ReturnType<typeof createMockMLXService>;

describe('CompositeModelProvider', () => {
	let compositeProvider: CompositeModelProvider;
	let mockMLXService: MockMLXService;

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		mockMLXService = createMockMLXService();
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
				}),
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
			const request: ChatRequest = {
				messages: [
					{ role: 'system', content: 'You are helpful' },
					{ role: 'user', content: 'Hello' },
				],
				model: 'custom-model',
				task: 'code',
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

			expect(emitSpy).toHaveBeenCalledWith(
				'embeddings-generated',
				expect.objectContaining({
					provider: 'mlx',
					attempts: 1,
					textCount: 1,
				}),
			);

			await compositeProvider.generateChat({
				messages: [{ role: 'user', content: 'test' }],
			});

			expect(emitSpy).toHaveBeenCalledWith(
				'chat-generated',
				expect.objectContaining({
					provider: 'mlx',
					attempts: 1,
					messageCount: 1,
				}),
			);
		});
	});

	describe('Fallback behavior', () => {
		it('should fall back to the next provider when the primary execution fails', async () => {
			const config = {
				mlx: { enabled: true, service: mockMLXService, priority: 1 },
				ollama: { enabled: true, priority: 2 },
			};
			mockMLXService.generateChat.mockRejectedValueOnce(
				new Error('MLX failure for brAInwav fallback'),
			);
			compositeProvider = createCompositeProvider(config);
			const events = captureEvents(compositeProvider, [
				'provider-failed',
				'provider-success',
				'chat-generated',
			]);
			const fetchSpy = mockFetchSuccess({
				response: 'Ollama fallback response with brAInwav context',
				model: 'llama3.2:3b',
				prompt_eval_count: 12,
				eval_count: 4,
			});
			const result = await compositeProvider.generateChat({
				messages: [{ role: 'user', content: 'Hi brAInwav fallback' }],
			});
			expect(result.provider).toBe('ollama');
			expect(fetchSpy).toHaveBeenCalledTimes(1);
			expect(mockMLXService.generateChat).toHaveBeenCalledTimes(1);
			const failedEvents = getEvents(events, 'provider-failed');
			expect(failedEvents).toHaveLength(1);
			expect(failedEvents[0]).toMatchObject({
				provider: 'mlx',
				error: 'MLX failure for brAInwav fallback',
			});
			const successEvents = getEvents(events, 'provider-success');
			expect(successEvents).toHaveLength(1);
			expect(successEvents[0]).toMatchObject({ provider: 'ollama' });
			const chatEvents = getEvents(events, 'chat-generated');
			expect(chatEvents).toHaveLength(1);
			expect(chatEvents[0]).toMatchObject({
				provider: 'ollama',
				attempts: 2,
				messageCount: 1,
			});
		});

		it('should skip unavailable providers and continue the fallback chain', async () => {
			const config = {
				ollama: { enabled: true, priority: 1 },
				mlx: { enabled: true, service: mockMLXService, priority: 2 },
			};
			compositeProvider = createCompositeProvider(config);
			const events = captureEvents(compositeProvider, [
				'provider-skipped',
				'provider-success',
				'chat-generated',
			]);
			const [primaryProvider] = compositeProvider.getProviders();
			vi.spyOn(primaryProvider, 'isAvailable').mockResolvedValue(false);
			const result = await compositeProvider.generateChat({
				messages: [{ role: 'user', content: 'Fallback for brAInwav availability' }],
			});
			expect(result.provider).toBe('mlx');
			const skippedEvents = getEvents(events, 'provider-skipped');
			expect(skippedEvents).toHaveLength(1);
			expect(skippedEvents[0]).toMatchObject({
				provider: primaryProvider.name,
				reason: 'unavailable',
			});
			const successEvents = getEvents(events, 'provider-success');
			expect(successEvents).toHaveLength(1);
			expect(successEvents[0]).toMatchObject({ provider: 'mlx' });
			const chatEvents = getEvents(events, 'chat-generated');
			expect(chatEvents).toHaveLength(1);
			expect(chatEvents[0]).toMatchObject({
				provider: 'mlx',
				attempts: 2,
				messageCount: 1,
			});
			expect(mockMLXService.generateChat).toHaveBeenCalledTimes(1);
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
			expect(mockMLXService.rerank).toHaveBeenCalledWith(
				'test query',
				['doc1', 'doc2', 'doc3'],
				undefined,
			);
		});
	});
});
