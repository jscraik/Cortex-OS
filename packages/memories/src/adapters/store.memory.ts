import { decayEnabled, decayFactor, getHalfLifeMs } from '../core/decay.js';
import { isExpired } from '../core/ttl.js';
import type { Memory } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

// Helper function to calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) {
		throw new Error('Vectors must have the same length');
	}

	const dotProduct = a.reduce((sum, _, i) => sum + a[i] * (b[i] || 0), 0);
	const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
	const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

	if (magnitudeA === 0 || magnitudeB === 0) {
		return 0;
	}

	return dotProduct / (magnitudeA * magnitudeB);
}

export class InMemoryStore implements MemoryStore {
	private readonly data = new Map<string, Map<string, Memory>>();

	private ns(name: string) {
		let store = this.data.get(name);
		if (!store) {
			store = new Map();
			this.data.set(name, store);
		}
		return store;
	}

	async upsert(m: Memory, namespace = 'default') {
		this.ns(namespace).set(m.id, m);
		return m;
	}
	async get(id: string, namespace = 'default') {
		return this.ns(namespace).get(id) ?? null;
	}
	async delete(id: string, namespace = 'default') {
		this.ns(namespace).delete(id);
	}

	async searchByText(q: TextQuery, namespace = 'default') {
		let items = [...this.ns(namespace).values()].filter(
			(x) =>
				(!q.filterTags || q.filterTags.every((t) => x.tags.includes(t))) &&
				(x.text?.toLowerCase().includes(q.text.toLowerCase()) ?? false),
		);
		if (decayEnabled()) {
			const now = new Date().toISOString();
			const half = getHalfLifeMs();
			items = items
				.map((m) => ({ m, s: decayFactor(m.createdAt, now, half) }))
				.sort((a, b) => b.s - a.s)
				.map((x) => x.m);
		}
		const topK = q.topK ?? 10;
		return items.slice(0, topK);
	}

	async searchByVector(q: VectorQuery, namespace = 'default') {
		let itemsWithScores = [...this.ns(namespace).values()]
			.filter((x) => x.vector && (!q.filterTags || q.filterTags.every((t) => x.tags.includes(t))))
			.map((x) => {
				const queryVec = q.vector ?? q.embedding;
				const targetVec = x.vector;
				const score = queryVec && targetVec ? cosineSimilarity(queryVec, targetVec) : 0;
				return { memory: x, score };
			});
		if (decayEnabled()) {
			const now = new Date().toISOString();
			const half = getHalfLifeMs();
			itemsWithScores = itemsWithScores.map((it) => ({
				...it,
				score: it.score * decayFactor(it.memory.createdAt, now, half),
			}));
		}
		const topK = q.topK ?? 10;
		itemsWithScores.sort((a, b) => b.score - a.score);
		const sorted = itemsWithScores.slice(0, topK).map((item) => item.memory);

		return sorted;
	}

	async purgeExpired(nowISO: string, namespace?: string): Promise<number> {
		let purgedCount = 0;
		const maps = namespace ? [this.ns(namespace)] : [...this.data.values()];
		for (const store of maps) {
			for (const [id, memory] of store.entries()) {
				if (memory.ttl && isExpired(memory.createdAt, memory.ttl, nowISO)) {
					store.delete(id);
					purgedCount++;
				}
			}
		}
		return purgedCount;
	}

	async list(namespace = 'default', limit?: number, offset?: number): Promise<Memory[]> {
		const items = [...this.ns(namespace).values()];

		// Apply decay if enabled
		let result = items;
		if (decayEnabled()) {
			const now = new Date().toISOString();
			const half = getHalfLifeMs();
			result = items
				.map((m) => ({ m, s: decayFactor(m.createdAt, now, half) }))
				.sort((a, b) => b.s - a.s)
				.map((x) => x.m);
		}

		// Apply offset and limit
		const start = offset || 0;
		const end = limit ? start + limit : undefined;

		return result.slice(start, end);
	}
}
