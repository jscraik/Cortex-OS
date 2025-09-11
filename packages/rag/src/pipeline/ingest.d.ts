import type { Embedder, Store } from '../lib';
export interface IngestTextParams {
	source: string;
	text: string;
	embedder: Embedder;
	store: Store;
	chunkSize?: number;
	overlap?: number;
}
export declare function ingestText(params: IngestTextParams): Promise<void>;
//# sourceMappingURL=ingest.d.ts.map
