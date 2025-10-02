---
title: Retrieval Post Chunking
sidebar_label: Retrieval Post Chunking
---

# Retrieval Post-Chunking

The pipeline supports an optional post-chunking pass that merges adjacent chunks to reduce citation count and/or total returned text length.

Config path: `retrieval.postChunking`

- `enabled` (boolean): Turn on the merge step. Default `false`.
- `maxChars` (number): Target maximum merged text size per citation. Default `1200`.
- `intentStrategy` ("none" | "stub"): Placeholder hook for intent-aware merging. Default `none`.

Example:

```ts
const pipeline = new RAGPipeline({
  embedder,
  store,
  retrieval: {
    postChunking: {
      enabled: true,
      maxChars: 1000,
      intentStrategy: 'none'
    }
  }
});
```

Local A/B test:

```bash
pnpm -w -C packages/rag test -- src/retrieval/post-chunking.ab.test.ts
```

Expected effect: Fewer citations or reduced total combined text length versus baseline.
