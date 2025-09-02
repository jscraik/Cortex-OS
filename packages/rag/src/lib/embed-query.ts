// Define a generic interface for embedders with an embed method
export interface Embedder {
	embed(queries: string[]): Promise<any[]>;
}

export async function embedQuery(embedder: Embedder, query: string) {
	const [embedding] = await embedder.embed([query]);
	return embedding;
}
