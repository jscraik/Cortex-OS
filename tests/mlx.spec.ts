import { describe, expect, it, vi } from 'vitest';

const mockEmbedding = (text: string): number[] => [text.charCodeAt(0) % 10, text.length];

vi.mock('@frost-beta/clip', () => {
	class MockClip {
		computeLabelEmbeddingsJs(labels: string[]): number[][] {
			return labels.map(mockEmbedding);
		}
	}
	return { Clip: MockClip };
});

import { embed, rerank } from '../src/lib/mlx/index.js';

describe('mlx helpers', () => {
	it('embed returns embeddings', async () => {
		const texts = ['alpha', 'beta'];
		await expect(embed(texts)).resolves.toEqual(texts.map(mockEmbedding));
	});

	it('rerank returns cosine similarity scores', async () => {
		const query = 'alpha';
		const docs = ['alpha', 'beta'];
		const qe = mockEmbedding(query);
		const expected = docs.map((doc) => {
			const de = mockEmbedding(doc);
			const dot = qe.reduce((sum, v, i) => sum + v * de[i], 0);
			const normQ = Math.sqrt(qe.reduce((sum, v) => sum + v * v, 0));
			const normD = Math.sqrt(de.reduce((sum, v) => sum + v * v, 0));
			return dot / (normQ * normD);
		});
		await expect(rerank(query, docs)).resolves.toEqual(expected);
	});

	it('embed rejects invalid input', async () => {
		await expect(embed([] as unknown as string[])).rejects.toThrow(/Invalid embed input/);
		await expect(embed(['', 'valid'])).rejects.toThrow(/Invalid embed input/);
	});

	it('rerank rejects invalid input', async () => {
		await expect(rerank('', ['doc'])).rejects.toThrow(/Invalid rerank input/);
		await expect(rerank('query', [])).rejects.toThrow(/Invalid rerank input/);
		await expect(rerank('query', ['doc', '' as any])).rejects.toThrow(/Invalid rerank input/);
	});
});
