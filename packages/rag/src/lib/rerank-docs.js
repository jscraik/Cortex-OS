export async function rerankDocs(reranker, query, documents, topK) {
	const rerankDocs = documents.map((doc) => ({
		id: doc.id,
		text: doc.content,
	}));
	const reranked = await reranker.rerank(query, rerankDocs, topK);
	return reranked.map((doc) => ({
		id: doc.id,
		content: doc.text,
		metadata: documents.find((d) => d.id === doc.id)?.metadata,
		similarity: doc.score,
	}));
}
//# sourceMappingURL=rerank-docs.js.map
