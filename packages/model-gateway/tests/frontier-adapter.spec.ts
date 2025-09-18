import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { FrontierAdapter } from '../src/adapters/frontier-adapter';
import type { MLXAdapter } from '../src/adapters/mlx-adapter';
import type { OllamaAdapter } from '../src/adapters/ollama-adapter';
import { ModelRouter } from '../src/model-router';

/**
 * Integration tests ensuring ModelRouter can utilize the Frontier adapter
 * when other providers are unavailable.
 */
describe('ModelRouter - Frontier integration', () => {
	let router: ModelRouter;
	let mlx: MLXAdapter;
	let ollama: OllamaAdapter;
	let frontier: FrontierAdapter;

	beforeEach(async () => {
		mlx = {
			isAvailable: vi.fn().mockResolvedValue(false),
		} as unknown as MLXAdapter;
		ollama = {
			isAvailable: vi.fn().mockResolvedValue(false),
		} as unknown as OllamaAdapter;
		frontier = {
			isAvailable: vi.fn().mockResolvedValue(true),
			generateEmbedding: vi.fn().mockResolvedValue({
				embedding: [1, 2, 3],
				model: 'frontier-embedding',
			}),
			generateEmbeddings: vi
				.fn()
				.mockResolvedValue([{ embedding: [1, 2, 3], model: 'frontier-embedding' }]),
			generateChat: vi.fn().mockResolvedValue({ content: 'hi', model: 'frontier-chat' }),
			rerank: vi.fn().mockResolvedValue({ scores: [1, 0], model: 'frontier-rerank' }),
		} as unknown as FrontierAdapter;

		router = new ModelRouter(mlx, ollama, frontier);
		await router.initialize();
	});

	it('routes embedding generation to Frontier', async () => {
		const result = await router.generateEmbedding({ text: 'hello' });
		expect(result.model).toBe('frontier-embedding');
		expect((frontier.generateEmbedding as Mock).mock.calls.length).toBe(1);
	});

	it('routes chat generation to Frontier', async () => {
		const result = await router.generateChat({
			messages: [{ role: 'user', content: 'hi' }],
		});
		expect(result.model).toBe('frontier-chat');
		expect((frontier.generateChat as Mock).mock.calls.length).toBe(1);
	});

	it('routes rerank requests to Frontier', async () => {
		const result = await router.rerank({ query: 'q', documents: ['a', 'b'] });
		expect(result.model).toBe('frontier-rerank');
		expect((frontier.rerank as Mock).mock.calls.length).toBe(1);
	});
});
