# API Reference

## RAGPipeline
```typescript
new RAGPipeline(options: {
  embedder: Embedder;
  store: Store;
  chunkSize?: number;
  chunkOverlap?: number;
  freshnessEpsilon?: number;
})
```
Methods:
- `ingest(documents: Document[])`: chunk, embed and store documents.
- `retrieve(query: string, k?: number)`: return top results.
- `retrieveMultiModal(options)`: combine text and image queries.

## Embedders
- `PythonEmbedder` – HTTP client for external embedding service.
- `CompositeEmbedder` – fallback chain across providers.

## Stores
- `MemoryStore` – in-memory vector store for tests.
- `Store` interface – implement to integrate external DBs.
