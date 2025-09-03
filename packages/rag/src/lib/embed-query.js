export async function embedQuery(embedder, query) {
    const [embedding] = await embedder.embed([query]);
    return embedding;
}
//# sourceMappingURL=embed-query.js.map