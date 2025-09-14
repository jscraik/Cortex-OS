---
title: Api Reference
sidebar_label: Api Reference
---

# API Reference

## `runGate(config, deps): Promise&lt;GateResult&gt;`

Executes all enabled suites defined in `config` using the provided dependencies.

- `config`: object matching `GateConfig`.
- `deps`: map of suite names to their dependency objects.

Returns a `GateResult`:

```ts
interface GateResult {
  pass: boolean;
  outcomes: SuiteOutcome[];
  startedAt: string;
  finishedAt: string;
}
```

## Suite Dependencies

### RAG Suite
```ts
interface RagDeps {
  createEmbedder(): Promise&lt;Embedder&gt;;
  createMemoryStore(): unknown;
  prepareStore(dataset: GoldenDataset, embedder: Embedder, store: unknown): Promise&lt;void&gt;;
  runRetrievalEval(dataset: GoldenDataset, embedder: Embedder, store: unknown, opts: {k: number}): Promise&lt;Summary&gt;;
}
```

### Router Suite
```ts
interface Router {
  initialize(): Promise&lt;void&gt;;
  generateEmbedding(req: {text: string}): Promise&lt;{embedding: number[]}&gt;;
  generateChat(req: {messages: {role: string; content: string}[]}): Promise&lt;{content: string}&gt;;
  rerank(req: {query: string; documents: string[]}): Promise&lt;{scores: number[]}&gt;;
  hasAvailableModels(capability: 'embedding' | 'chat' | 'reranking'): boolean;
}
```
