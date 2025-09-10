import type { Embedder } from '../ports/Embedder.js';

/**
 * NoopEmbedder returns empty vectors for all inputs.
 * Useful for offline workflows where embeddings are not required.
 */
export class NoopEmbedder implements Embedder {
	name(): string {
		return 'noop';
	}

	async embed(texts: string[]): Promise<number[][]> {
		return texts.map(() => []);
	}
}
