import type { Chunk } from '../../lib/types.js';
import type { LanceDbLike } from '../lancedb-store.js';

export interface ListableSource {
	listAll: () => Promise<Array<Chunk & { embedding?: number[] }>>;
}

export async function fromAnyListableToLance(
	source: ListableSource,
	target: LanceDbLike,
	options?: { batchSize?: number },
): Promise<{ migrated: number }> {
	const batchSize = Math.max(1, options?.batchSize ?? 500);
	const all = await source.listAll();
	let migrated = 0;
	for (let i = 0; i < all.length; i += batchSize) {
		const slice = all.slice(i, i + batchSize);
		const items = slice
			.filter((c) => Array.isArray(c.embedding))
			.map((c) => ({ id: c.id, vector: c.embedding as number[], metadata: c.metadata }));
		if (items.length > 0) {
			await target.upsert(items);
			migrated += items.length;
		}
	}
	return { migrated };
}
