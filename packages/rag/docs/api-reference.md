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

## MCP Tools

| Tool | Purpose | Key Input Fields | Output Payload |
| --- | --- | --- | --- |
| `rag.document.ingest` | Batch ingest documents into the Cortex knowledge base | `documents[]` (id, content, optional metadata/tags), `options.mode`, `options.chunking.maxChars` | `{ ingested, skipped, warnings[], correlationId }` |
| `rag.search` | Execute hybrid or semantic searches | `query`, optional `topK`, `mode`, `filters`, `includeMetadata` | `{ query, mode, results[], hasMore }` |
| `rag.retrieve` | Fetch canonical documents and supporting chunks by identifier | `documentIds[]`, `includeContent`, `includeMetadata`, optional `chunkLimit` | `{ documents[], correlationId, warnings[] }` |

### `rag.document.ingest`
- Rejects batches with no documents.
- Document identifiers must use alphanumeric characters plus `._:-` and be 3-256 characters long.
- Optional chunking controls default to `maxChars=2000` and `overlap=200`.
- Standard error codes: `validation_error`, `quota_exceeded`, `internal_error`.

### `rag.search`
- Requires a non-empty query after trimming whitespace.
- Supports search `mode` values `hybrid`, `semantic`, or `keyword` with default `hybrid`.
- `topK` is capped at 50 results to avoid runaway responses.
- Emits structured result objects containing snippet text, optional metadata, and chunk/document identifiers.

### `rag.retrieve`
- Requires at least one document identifier per request and caps requests at 100 ids.
- `includeContent` and `includeMetadata` default to `true`; `includeChunks` defaults to `false` for lightweight lookups.
- Optional `chunkLimit` lets clients request a bounded number of evidence chunks.
- Standard error codes: `validation_error`, `not_found`, `internal_error`.
