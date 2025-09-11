import { describe, expect, it } from 'vitest';
import {
	generateEmbedding,
	rerankDocuments,
} from '../../../src/lib/mlx/index.ts';

describe('MLX end-to-end flow', () => {
	it('embeds and reranks documents', async () => {
		const docs = ['apple pie recipe', 'banana bread'];
		const embeddings = await generateEmbedding(docs);
		expect(embeddings).toHaveLength(2);
		const ranked = await rerankDocuments('apple', docs);
		expect(ranked[0].text).toBe('apple pie recipe');
	});
});
