import { describe, expect, test, vi } from 'vitest';
import { embeddingsHandler } from '../src/handlers';

describe('embeddingsHandler', () => {
	test('returns vectors for single text', async () => {
		const router = {
			generateEmbedding: vi.fn().mockResolvedValue({ embedding: [1, 2], model: 'm' }),
			generateEmbeddings: vi.fn(),
		};
		const result = await embeddingsHandler(router, {
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
		const router = {
			generateEmbeddings: vi.fn().mockResolvedValue({
				embeddings: [],
				model: 'test-model',
			}),
		};
		const result = await embeddingsHandler(router, {
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
//# sourceMappingURL=embeddings-handler.test.js.map
