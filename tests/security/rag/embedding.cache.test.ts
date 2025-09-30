import type { Embedder } from '@cortex-os/rag';
import { expect } from 'vitest';

class CountingEmbedder implements Embedder {
	model = 'dummy-1.0';
	dim = 3;
	calls = 0;
	async embed(texts: string[]) {
		this.calls += 1;
		return texts.map((t) => Array(this.dim).fill(t.length));
	}
}

function caching(inner: Embedder): Embedder {
	const cache = new Map<string, number[]>();
	return {
		model: inner.model,
		dim: inner.dim,
		async embed(texts: string[]) {
			const misses: string[] = [];
			const output: number[][] = [];
			for (const t of texts) {
				const cached = cache.get(t);
				if (cached) output.push(cached);
				else misses.push(t);
			}
			if (misses.length) {
				const fresh = await inner.embed(misses);
				for (let i = 0; i < misses.length; i++) {
					const t = misses[i];
					cache.set(t, fresh[i]);
				}
			}
			for (const t of texts) {
				const cached = cache.get(t);
				if (cached) output.push(cached);
			}
			return output;
		},
	};
}

it('caches repeated embeddings', async () => {
	const base = new CountingEmbedder();
	const cached = caching(base);
	await cached.embed(['a']);
	await cached.embed(['a']);
	expect(base.calls).toBe(1);
});
