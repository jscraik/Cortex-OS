import { z } from 'zod';
import { byChars } from '../chunk/index.js';
import type { Chunk, Embedder, Store } from '../lib/index.js';

const schema = z.object({
	source: z.string(),
	text: z.string().min(1),
	embedder: z.custom<Embedder>(
		(e): e is Embedder =>
			typeof e === 'object' && e !== null && typeof (e as any).embed === 'function',
	),
	store: z.custom<Store>(
		(s): s is Store =>
			typeof s === 'object' && s !== null && typeof (s as any).upsert === 'function',
	),
	chunkSize: z.number().int().positive().default(300),
	overlap: z.number().int().nonnegative().default(0),
});

export type IngestTextParams = z.input<typeof schema>;

export async function ingestText(params: IngestTextParams): Promise<void> {
	const { source, text, embedder, store, chunkSize, overlap } = schema.parse(params);
	const parts = byChars(text, chunkSize, overlap);
	const now = Date.now();
	const chunks: Chunk[] = parts.map((p, i) => ({
		id: `${source}#${i}`,
		text: p,
		source,
		updatedAt: now,
	}));
	const embeddings = await embedder.embed(chunks.map((c) => c.text));
	if (embeddings.length !== chunks.length) {
		throw new Error(
			`Embedding count (${embeddings.length}) does not match chunk count (${chunks.length})`,
		);
	}
	const withEmb = chunks.map((c, i) => ({
		...c,
		updatedAt: c.updatedAt ?? Date.now(),
		embedding: embeddings[i],
	}));
	await store.upsert(withEmb);
}
