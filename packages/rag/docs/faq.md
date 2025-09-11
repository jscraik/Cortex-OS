# FAQ

**Why are no results returned?**
- Ensure documents were ingested and the query exceeds `minScore`.

**Can I use other embedding models?**
- Yes. Implement the `Embedder` interface or use `CompositeEmbedder`.

**Is there a hosted vector store?**
- Not yet. You can plug in any store that implements the `Store` interface.
