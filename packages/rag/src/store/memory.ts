import type { Chunk, Store } from '../lib/index.js';

export function memoryStore(): Store {
    const items: Array<Chunk & { embedding?: number[] }> = [];
    return {
        async upsert(chunks: Chunk[]) {
            for (const c of chunks) {
                const cc = { ...c, updatedAt: c.updatedAt ?? Date.now() } as Chunk;
                const i = items.findIndex((x) => x.id === c.id);
                if (i >= 0) items[i] = cc;
                else items.push(cc);
            }
        },
		async query(embedding: number[], k = 5) {
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
            const scored = items
                .filter((x) => Array.isArray(x.embedding))
                .map((x) => ({
                    ...x,
                    updatedAt: (x as any).updatedAt ?? Date.now(),
                    score: sim(embedding, x.embedding as number[]),
                }))
                .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                .slice(0, k);
            return scored;
        },
	};
}
