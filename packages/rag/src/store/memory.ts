import { z } from 'zod';
import type { Chunk, Store } from '../lib/index.js';

export function memoryStore(): Store {
	const items: Array<Chunk & { embedding?: number[] }> = [];

	// Define a Zod schema for a Chunk. Adjust as needed for your actual Chunk type.
	const ChunkSchema = z.object({
		id: z.string(),
		content: z.string(),
		// Add other required properties as needed, e.g.:
		// updatedAt: z.number().optional(),
		// metadata: z.any().optional(),
	});

	function assertChunkArray(input: unknown): asserts input is Chunk[] {
		if (!Array.isArray(input)) {
			throw new TypeError('memoryStore.upsert expects an array of chunks');
		}
		for (const value of input) {
			const result = ChunkSchema.safeParse(value);
			if (!result.success) {
				throw new TypeError(
					`memoryStore.upsert received an invalid chunk payload: ${result.error.message}`,
				);
			}
		}
	}

	function assertEmbeddingVector(input: unknown): asserts input is number[] {
		if (!Array.isArray(input) || input.length === 0) {
			throw new TypeError('memoryStore.query requires a non-empty embedding vector');
		}
		for (const value of input) {
			if (typeof value !== 'number' || !Number.isFinite(value)) {
				throw new TypeError('memoryStore.query received a non-finite embedding value');
			}
		}
	}

	const base: Store = {
		async upsert(chunks: Chunk[]) {
			assertChunkArray(chunks);
			for (const c of chunks) {
				const cc = { ...c, updatedAt: c.updatedAt ?? Date.now() } as Chunk;
				const i = items.findIndex((x) => x.id === c.id);
				if (i >= 0) items[i] = cc;
				else items.push(cc);
			}
		},
		async query(embedding: number[], k = 5) {
			assertEmbeddingVector(embedding);
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
					updatedAt: x.updatedAt ?? Date.now(),
					score: sim(embedding, x.embedding as number[]),
				}))
				.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
				.slice(0, k);
			return scored;
		},
	};
	// Attach optional admin/list methods (feature-detected by consumers)
	const extended = base as Store & {
		listAll?: () => Promise<Array<Chunk & { embedding?: number[] }>>;
		delete?: (ids: string[]) => Promise<void>;
		countByWorkspace?: (workspaceId: string) => Promise<number>;
		deleteByWorkspace?: (workspaceId: string) => Promise<void>;
	};
	extended.listAll = async () => items.slice();
	extended.delete = async (ids: string[]) => {
		for (const id of ids) {
			const i = items.findIndex((x) => x.id === id);
			if (i >= 0) items.splice(i, 1);
		}
	};
	extended.countByWorkspace = async (workspaceId: string) =>
		items.filter((c) => c.metadata?.workspaceId === workspaceId).length;
	extended.deleteByWorkspace = async (workspaceId: string) => {
		for (let i = items.length - 1; i >= 0; i--) {
			if (items[i].metadata?.workspaceId === workspaceId) items.splice(i, 1);
		}
	};
	return extended;
}
