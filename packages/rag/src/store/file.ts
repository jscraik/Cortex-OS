import { promises as fs } from 'node:fs';
import type { Chunk, Store } from '../lib/index.js';

export function fileStore(path: string): Store {
	let items: Array<Chunk & { embedding?: number[] }> = [];

	async function load() {
		try {
			const data = await fs.readFile(path, 'utf8');
			items = JSON.parse(data);
		} catch {
			items = [];
		}
	}

	async function persist() {
		await fs.writeFile(path, JSON.stringify(items), 'utf8');
	}

	function sim(a: number[], b: number[]) {
		if (!a || !b || a.length !== b.length) return 0;
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

	return {
		async upsert(chunks: Chunk[]) {
			await load();
			for (const c of chunks) {
				const i = items.findIndex((x) => x.id === c.id);
				if (i >= 0) items[i] = c;
				else items.push(c);
			}
			await persist();
		},
		async query(embedding: number[], k = 5) {
			await load();
			const scored = items
				.filter((x) => Array.isArray(x.embedding))
				.map((x) => ({ ...x, score: sim(embedding, x.embedding as number[]) }))
				.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
				.slice(0, k);
			return scored;
		},
	};
}
