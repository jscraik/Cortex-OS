import { decayEnabled, decayFactor, getHalfLifeMs } from '../core/decay.js';
import { isExpired } from '../core/ttl.js';
import type { Memory, MemoryId } from '../domain/types.js';
import type {
	MemoryStore,
	TextQuery,
	VectorQuery,
} from '../ports/MemoryStore.js';

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
	private data = new Map<string, Map<MemoryId, Memory>>();

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
	async get(id: MemoryId, namespace = 'default') {
		return this.ns(namespace).get(id) ?? null;
	}
	async delete(id: MemoryId, namespace = 'default') {
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
		return items.slice(0, q.topK);
	}

	async searchByVector(q: VectorQuery, namespace = 'default') {
		let itemsWithScores = [...this.ns(namespace).values()]
			.filter(
				(x) =>
					x.vector &&
					(!q.filterTags || q.filterTags.every((t) => x.tags.includes(t))),
			)
			.map((x) => ({
				memory: x,
				score: cosineSimilarity(q.vector, x.vector!),
			}));
		if (decayEnabled()) {
			const now = new Date().toISOString();
			const half = getHalfLifeMs();
			itemsWithScores = itemsWithScores.map((it) => ({
				...it,
				score: it.score * decayFactor(it.memory.createdAt, now, half),
			}));
		}
		const sorted = itemsWithScores
			.sort((a, b) => b.score - a.score)
			.slice(0, q.topK)
			.map((item) => item.memory);

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
}
