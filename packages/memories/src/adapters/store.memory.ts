import type { Memory, MemoryId } from "../domain/types.js";
import type {
	MemoryStore,
	TextQuery,
	VectorQuery,
} from "../ports/MemoryStore.js";

// Helper function to calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) {
		throw new Error("Vectors must have the same length");
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
	private data = new Map<MemoryId, Memory>();

	async upsert(m: Memory) {
		this.data.set(m.id, m);
		return m;
	}
	async get(id: MemoryId) {
		return this.data.get(id) ?? null;
	}
	async delete(id: MemoryId) {
		this.data.delete(id);
	}

	async searchByText(q: TextQuery) {
		const items = [...this.data.values()].filter(
			(x) =>
				(!q.filterTags || q.filterTags.every((t) => x.tags.includes(t))) &&
				(x.text?.toLowerCase().includes(q.text.toLowerCase()) ?? false),
		);
		return items.slice(0, q.topK);
	}

	async searchByVector(q: VectorQuery) {
		const itemsWithScores = [...this.data.values()]
			.filter(
				(x) =>
					x.vector &&
					(!q.filterTags || q.filterTags.every((t) => x.tags.includes(t))),
			)
			.map((x) => ({
				memory: x,
				score: cosineSimilarity(q.vector, x.vector!),
			}))
			.sort((a, b) => b.score - a.score)
			.slice(0, q.topK)
			.map((item) => item.memory);

		return itemsWithScores;
	}

	async purgeExpired(nowISO: string): Promise<number> {
		const now = new Date(nowISO).getTime();
		let purgedCount = 0;

		for (const [id, memory] of this.data.entries()) {
			if (memory.ttl) {
				try {
					const created = new Date(memory.createdAt).getTime();
					// Parse ISO duration (simplified version)
					const match = memory.ttl.match(
						/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
					);
					if (match) {
						const days = Number(match[1] || 0);
						const hours = Number(match[2] || 0);
						const minutes = Number(match[3] || 0);
						const seconds = Number(match[4] || 0);
						const ttlMs =
							(((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;

						if (created + ttlMs <= now) {
							this.data.delete(id);
							purgedCount++;
						}
					}
				} catch (_error) {
					// Ignore invalid TTL formats
					console.warn(`Invalid TTL format for memory ${id}: ${memory.ttl}`);
				}
			}
		}

		return purgedCount;
	}
}
