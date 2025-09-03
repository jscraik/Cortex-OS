import type { Qwen3Reranker } from "../pipeline/qwen3-reranker.js";
import type { Document } from "./types.js";

export async function rerankDocs(
	reranker: Qwen3Reranker,
	query: string,
	documents: Document[],
	topK: number,
): Promise<Document[]> {
	const rerankDocs = documents.map((doc: Document) => ({
		id: doc.id,
		text: doc.content,
	}));
	const reranked = await reranker.rerank(query, rerankDocs, topK);
	return reranked.map((doc: { id: string; text: string; score?: number }) => ({
		id: doc.id,
		content: doc.text,
		metadata: documents.find((d: Document) => d.id === doc.id)?.metadata,
		similarity: doc.score,
	}));
}
