import type { Qwen3Reranker } from '../pipeline/qwen3-reranker.js';
import type { Document } from './types.js';
export declare function rerankDocs(
	reranker: Qwen3Reranker,
	query: string,
	documents: Document[],
	topK: number,
): Promise<Document[]>;
//# sourceMappingURL=rerank-docs.d.ts.map
