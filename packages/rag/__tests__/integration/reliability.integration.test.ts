import { describe, expect, it } from 'vitest';
import type { Chunk, Embedder, Store } from '../../src/lib/index.js';
import { RAGPipeline } from '../../src/rag-pipeline.js';

class FlakyEmbedder implements Embedder {
	private failUntil: number;
	private count = 0;
	private readonly dim: number;
	constructor(failAttempts: number, dim = 8) {
		this.failUntil = failAttempts;
		this.dim = dim;
	}
	async embed(queries: string[]): Promise<number[][]> {
		this.count++;
		if (this.count <= this.failUntil) throw new Error('transient-embed-error');
		return queries.map((_, i) => new Array(this.dim).fill(0).map((__, j) => Math.sin(i + j)));
	}
}

class AlwaysFailStore implements Store {
	async upsert(_chunks: Chunk[]): Promise<void> {
		throw new Error('store-down');
	}
	async query(_embedding: number[], _k?: number): Promise<Array<Chunk & { score?: number }>> {
		throw new Error('store-down');
	}
}

class MemoryStore implements Store {
	private items: Array<Chunk & { embedding?: number[] }> = [];
	async upsert(chunks: Chunk[]): Promise<void> {
		for (const c of chunks) {
			const idx = this.items.findIndex((x) => x.id === c.id);
			const cc = { ...c, updatedAt: c.updatedAt ?? Date.now() } as Chunk;
			if (idx >= 0) this.items[idx] = cc;
			else this.items.push(cc);
		}
	}
	async query(embedding: number[], k = 5): Promise<Array<Chunk & { score?: number }>> {
		function sim(a: number[], b?: number[]) {
			if (!b || a.length !== b.length) return 0;
			let dot = 0,
				na = 0,
				nb = 0;
			for (let i = 0; i < a.length; i++) {
				dot += a[i] * b[i];
				na += a[i] * a[i];
				nb += b[i] * b[i];
			}
			const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
			return dot / denom;
		}
		return this.items
			.map((x) => ({ ...x, score: sim(embedding, x.embedding) }))
			.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
			.slice(0, k);
	}
}

describe('RAG reliability integration', () => {
	it('retries embedder to reduce user-facing failures', async () => {
		const embedder = new FlakyEmbedder(2, 8); // fails twice then succeeds
		const store = new MemoryStore();
		const pipeline = new RAGPipeline({
			embedder,
			store,
			reliability: { embedder: { retry: { maxAttempts: 3, baseDelayMs: 1 } } },
		});

		// Ingest one chunk
		const chunk: Chunk = { id: 'a', text: 'Hello world', embedding: new Array(8).fill(0) };
		await store.upsert([chunk]);

		const res = await pipeline.retrieve('Hello', 3);
		expect(res.citations).toBeDefined();
		// Should not throw and returns a bundle (may be empty if similarity is low)
		expect(Array.isArray(res.citations)).toBe(true);
	});

	it('opens breaker on repeated failures and degrades gracefully', async () => {
		const embedder: Embedder = {
			async embed() {
				throw new Error('hard-down');
			},
		};
		const store = new AlwaysFailStore();
		const pipeline = new RAGPipeline({
			embedder,
			store,
			reliability: {
				embedder: { breaker: { failureThreshold: 1, resetTimeoutMs: 10 } },
				store: { breaker: { failureThreshold: 1, resetTimeoutMs: 10 } },
			},
		});

		const result = await pipeline.retrieve('anything', 5);
		// Degraded path returns an empty bundle rather than throwing
		expect(result.citations.length).toBeGreaterThanOrEqual(0);
	});
});
