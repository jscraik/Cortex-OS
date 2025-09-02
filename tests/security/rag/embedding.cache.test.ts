import type { Embeddings } from "@cortex-os/rag-embed/provider";
import { expect, it } from "vitest";

class CountingEmbedder implements Embeddings {
	model = "dummy-1.0";
	dim = 3;
	calls = 0;
	async embed(texts: string[]) {
		this.calls += 1;
		return texts.map((t) => Array(this.dim).fill(t.length));
	}
}

function caching(inner: Embeddings): Embeddings {
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
			for (const t of texts) output.push(cache.get(t)!);
			return output;
		},
	};
}

it("caches repeated embeddings", async () => {
	const base = new CountingEmbedder();
	const cached = caching(base);
	await cached.embed(["a"]);
	await cached.embed(["a"]);
	expect(base.calls).toBe(1);
});
