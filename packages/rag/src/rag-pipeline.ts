import { z } from 'zod';
import { CitationBundler } from './lib/citation-bundler.js';
import type { Chunk, CitationBundle, Embedder, Store } from './lib/index.js';
import { routeByFreshness } from './retrieval/freshness-router.js';
import { ingestText as ingestTextHelper } from './pipeline/ingest.js';

export interface RAGPipelineConfig {
    embedder: Embedder;
    store: Store;
    chunkSize?: number;
    chunkOverlap?: number;
    freshnessEpsilon?: number;
}

export class RAGPipeline {
	private E: Embedder;
	private S: Store;
	private chunkSize: number;
    private chunkOverlap: number;
    private freshnessEpsilon: number;

	constructor(config: RAGPipelineConfig) {
        const schema = z.object({
            embedder: z.custom<Embedder>(
				(e): e is Embedder =>
					typeof e === 'object' &&
					e !== null &&
					typeof (e as any).embed === 'function',
			),
			store: z.custom<Store>(
				(s): s is Store =>
					typeof s === 'object' &&
					s !== null &&
					typeof (s as any).upsert === 'function' &&
					typeof (s as any).query === 'function',
			),
            chunkSize: z.number().int().positive().default(300),
            chunkOverlap: z.number().int().nonnegative().default(0),
            freshnessEpsilon: z.number().min(0).max(1).default(0.02),
        });
        const parsed = schema.parse(config);
        this.E = parsed.embedder;
        this.S = parsed.store;
        this.chunkSize = parsed.chunkSize;
        this.chunkOverlap = parsed.chunkOverlap;
        this.freshnessEpsilon = parsed.freshnessEpsilon;
	}

	async ingest(chunks: Chunk[]): Promise<void> {
		const texts = chunks.map((c) => c.text);
		const embeddings = await this.E.embed(texts);
		if (embeddings.length !== chunks.length) {
			throw new Error(
				`Embedding count (${embeddings.length}) does not match chunk count (${chunks.length})`,
			);
		}
		const toUpsert = chunks.map((c, i) => ({ ...c, embedding: embeddings[i] }));
		await this.S.upsert(toUpsert);
	}

	async ingestText(source: string, text: string): Promise<void> {
		await ingestTextHelper({
			source,
			text,
			embedder: this.E,
			store: this.S,
			chunkSize: this.chunkSize,
			overlap: this.chunkOverlap,
		});
	}

    async retrieve(query: string, topK = 5): Promise<CitationBundle> {
        const [emb] = await this.E.embed([query]);
        const chunks = await this.S.query(emb, topK);
        const routed = routeByFreshness(chunks, { epsilon: this.freshnessEpsilon });
        const bundler = new CitationBundler();
        return bundler.bundle(routed);
    }
}
