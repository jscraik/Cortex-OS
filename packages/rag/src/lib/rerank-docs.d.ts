import { Qwen3Reranker } from '../pipeline/qwen3-reranker';
import type { Document } from './types';
export declare function rerankDocs(
  reranker: Qwen3Reranker,
  query: string,
  documents: Document[],
  topK: number,
): Promise<Document[]>;
//# sourceMappingURL=rerank-docs.d.ts.map
