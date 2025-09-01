import type { Qwen3Reranker } from '../pipeline/qwen3-reranker';
import type { Document } from './types';

export async function rerankDocs(
  reranker: Qwen3Reranker,
  query: string,
  documents: Document[],
  topK: number,
): Promise<Document[]> {
  const rerankDocs = documents.map((doc) => ({ id: doc.id, text: doc.content }));
  const reranked = await reranker.rerank(query, rerankDocs, topK);
  return reranked.map((doc) => ({
    id: doc.id,
    content: doc.text,
    metadata: documents.find((d) => d.id === doc.id)?.metadata,
    similarity: doc.score,
  }));
}
