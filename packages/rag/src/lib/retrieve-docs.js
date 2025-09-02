function cosineSimilarity(a, b) {
	const dotProduct = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
	const magnitudeA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
	const magnitudeB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
	return dotProduct / (magnitudeA * magnitudeB);
}
export async function retrieveDocs(embedder, queryEmbedding, documents, topK) {
	const scoredDocs = await Promise.all(
		documents.map(async (doc) => {
			let docWithEmbedding = doc;
			if (!doc.embedding) {
				const [embedding] = await embedder.embed([doc.content]);
				docWithEmbedding = { ...doc, embedding };
			}
			const similarity = cosineSimilarity(
				queryEmbedding,
				docWithEmbedding.embedding,
			);
			return { ...docWithEmbedding, similarity };
		}),
	);
	scoredDocs.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
	return scoredDocs.slice(0, topK);
}
//# sourceMappingURL=retrieve-docs.js.map
