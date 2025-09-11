# User Guide

## Ingest Documents
```typescript
await pipeline.ingest([
  { id: 'doc-1', text: 'Cortex-OS enables agents.' }
]);
```
- Documents may include `metadata` fields for filtering.
- Ingestion is batched using the configured `batchSize`.

## Retrieve Answers
```typescript
const hits = await pipeline.retrieve('What is Cortex-OS?');
```
- Adjust `topK` and `minScore` in options for precision.
- Recent documents win when scores are similar.

## Multi-Modal Queries
```typescript
const result = await pipeline.retrieveMultiModal({
  textQuery: 'architecture',
  imageQuery: buffer,
  weights: { text: 0.8, image: 0.2 }
});
```

## Custom Strategies
Implement a `RetrievalStrategy` and pass via the `retrievalStrategy` option to override default retrieval behaviour.
