import { Qwen3Embedder } from '../embed/qwen3';
import type { Document } from './types';
export declare function retrieveDocs(embedder: Qwen3Embedder, queryEmbedding: number[], documents: Document[], topK: number): Promise<Document[]>;
//# sourceMappingURL=retrieve-docs.d.ts.map