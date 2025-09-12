# API Reference

## `runGate(config, deps): Promise<GateResult>`

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
  createEmbedder(): Promise<Embedder>;
  createMemoryStore(): unknown;
  prepareStore(dataset: GoldenDataset, embedder: Embedder, store: unknown): Promise<void>;
  runRetrievalEval(dataset: GoldenDataset, embedder: Embedder, store: unknown, opts: {k: number}): Promise<Summary>;
}
```

### Router Suite
```ts
interface Router {
  initialize(): Promise<void>;
  generateEmbedding(req: {text: string}): Promise<{embedding: number[]}>;
  generateChat(req: {messages: {role: string; content: string}[]}): Promise<{content: string}>;
  rerank(req: {query: string; documents: string[]}): Promise<{scores: number[]}>;
  hasAvailableModels(capability: 'embedding' | 'chat' | 'reranking'): boolean;
}
```
