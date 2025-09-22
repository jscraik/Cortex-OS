import type { Chunk, Store } from '../lib/index.js';

// Minimal client interface to avoid hard dependency
export interface LanceDbLike {
	upsert(
		items: Array<{ id: string; vector: number[]; metadata?: Record<string, unknown> }>,
	): Promise<void>;
	query(
		vector: number[],
		k: number,
	): Promise<Array<{ id: string; score: number; metadata?: Record<string, unknown> }>>;
	delete?(ids: string[]): Promise<void>;
	listAll?: () => Promise<
		Array<{ id: string; vector?: number[]; metadata?: Record<string, unknown> }>
	>;
}

export interface LanceDbStoreOptions {
	dimensions?: number; // optional validation
}

export class LanceDbStore implements Store {
	private readonly client: LanceDbLike;
	private readonly dims?: number;

	constructor(client: LanceDbLike, options?: LanceDbStoreOptions) {
		this.client = client;
		this.dims = options?.dimensions;
	}

	async upsert(chunks: Chunk[]): Promise<void> {
		const items = chunks
			.filter((c) => Array.isArray(c.embedding))
			.map((c) => ({ id: c.id, vector: c.embedding as number[], metadata: c.metadata }));
		if (this.dims) for (const it of items) validateDims(it.vector, this.dims);
		await this.client.upsert(items);
	}

	async query(embedding: number[], k = 5): Promise<Array<Chunk & { score?: number }>> {
		if (this.dims) validateDims(embedding, this.dims);
		const rows = await this.client.query(embedding, k);
		return rows.map((r) => ({ id: r.id, text: '', metadata: r.metadata ?? {}, score: r.score }));
	}

	// Optional helpers for migration tools
	async listAll(): Promise<Array<Chunk & { embedding?: number[] }>> {
		if (!this.client.listAll) return [];
		const rows = await this.client.listAll();
		return rows.map((r) => ({
			id: r.id,
			text: '',
			metadata: r.metadata ?? {},
			embedding: r.vector,
		}));
	}

	async delete(ids: string[]): Promise<void> {
		if (!this.client.delete) return;
		await this.client.delete(ids);
	}
}

function validateDims(vec: number[], dims: number) {
	if (!Array.isArray(vec) || vec.length !== dims) {
		throw new Error(`Invalid embedding dimensions: expected ${dims}, got ${vec?.length ?? 'na'}`);
	}
}

export function createLanceDbStore(client: LanceDbLike, options?: LanceDbStoreOptions): Store {
	return new LanceDbStore(client, options);
}
