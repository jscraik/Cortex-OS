import { describe, expect, test, vi } from 'vitest';
import { embeddingsHandler } from '../src/handlers.js';
import type { ModelRouter } from '../src/model-router.js';

describe('embeddingsHandler', () => {
	test('returns vectors for single text', async () => {
		const router: Partial<ModelRouter> = {
			generateEmbedding: vi
				.fn()
				.mockResolvedValue({ embedding: [1, 2], model: 'm', vector: [1, 2] }),
			generateEmbeddings: vi.fn(),
		};
		const result = await embeddingsHandler(router as ModelRouter, {
			texts: ['hi'],
			model: 'm',
		});
		expect(result).toEqual({
			vectors: [[1, 2]],
			dimensions: 2,
			modelUsed: 'm',
		});
	});

	test('calls generateEmbeddings for empty texts array', async () => {
		const router: Partial<ModelRouter> = {
			generateEmbeddings: vi.fn().mockResolvedValue({
				embeddings: [],
				model: 'test-model',
			}),
		};
		const result = await embeddingsHandler(router as ModelRouter, {
			texts: [],
		});
		expect(router.generateEmbeddings).toHaveBeenCalledWith({
			texts: [],
			model: undefined,
		});
		expect(result).toEqual({
			vectors: [],
			dimensions: 0,
			modelUsed: 'test-model',
		});
	});
});
