import { z } from 'zod';
import { ProcessingDispatcher, type ProcessingFile } from '../chunkers/dispatch.js';
import type { Chunk, Embedder, Store } from '../lib/index.js';
import { MimePolicyEngine, type StrategyDecision } from '../policy/mime.js';

const schema = z.object({
	source: z.string(),
	text: z.string().min(1),
	embedder: z.custom<Embedder>(
		(e): e is Embedder => typeof (e as { embed?: unknown }).embed === 'function',
	),
	store: z.custom<Store>(
		(s): s is Store => typeof (s as { upsert?: unknown }).upsert === 'function',
	),
	dispatcherConfig: z
		.object({ timeout: z.number().int().positive().optional() })
		.partial()
		.optional(),
	processing: z
		.object({ chunker: z.literal('hierarchical') })
		.passthrough()
		.default({ chunker: 'hierarchical' }),
});

export type IngestHierarchicalParams = z.input<typeof schema>;

export async function ingestHierarchical(params: IngestHierarchicalParams): Promise<void> {
	const { source, text, embedder, store, dispatcherConfig } = schema.parse(params);
	const dispatcher = new ProcessingDispatcher(dispatcherConfig);
	const engine = new MimePolicyEngine();
	const file: ProcessingFile = {
		path: source,
		content: Buffer.from(text, 'utf-8'),
		mimeType: 'text/plain',
		size: Buffer.byteLength(text, 'utf-8'),
	};
	// Start from the policy engine's decision for text/plain, then force hierarchical chunker
	const baseDecision = engine.parseStrategy('text/plain');
	const decision: StrategyDecision = {
		...baseDecision,
		processing: baseDecision.processing
			? { ...baseDecision.processing, chunker: 'hierarchical' }
			: {
					chunker: 'hierarchical',
					requiresOCR: false,
					requiresUnstructured: false,
					maxPages: null,
				},
	};
	const result = await dispatcher.dispatch(file, decision);
	if (!result.success || !result.chunks) {
		throw new Error(`Hierarchical ingest failed: ${result.error || 'Unknown error'}`);
	}
	const now = Date.now();
	const chunks: Chunk[] = result.chunks.map((c, idx) => ({
		id: c.id || `${source}#${idx}`,
		text: c.content,
		source,
		updatedAt: now,
		metadata: c.metadata,
	}));
	const embeddings = await embedder.embed(chunks.map((c) => c.text));
	if (embeddings.length !== chunks.length) {
		throw new Error(
			`Embedding count (${embeddings.length}) does not match chunk count (${chunks.length})`,
		);
	}
	const toUpsert = chunks.map((c, i) => ({ ...c, embedding: embeddings[i] }));
	await store.upsert(toUpsert);
}
