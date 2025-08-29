import { Qwen3Embedder } from '../embed/qwen3';
import type { Document } from './types';

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export async function retrieveDocs(
  embedder: Qwen3Embedder,
  queryEmbedding: number[],
  documents: Document[],
  topK: number,
): Promise<Document[]> {
  const scoredDocs = await Promise.all(
    documents.map(async (doc) => {
      if (!doc.embedding) {
        const [embedding] = await embedder.embed([doc.content]);
        doc.embedding = embedding;
      }
      const similarity = cosineSimilarity(queryEmbedding, doc.embedding!);
      return { ...doc, similarity };
    }),
  );
  scoredDocs.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
  return scoredDocs.slice(0, topK);
}
