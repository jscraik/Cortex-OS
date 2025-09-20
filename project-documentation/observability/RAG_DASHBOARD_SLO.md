# RAG Observability: Dashboard & SLOs

This doc outlines key metrics, suggested SLOs, and an example dashboard for the RAG package.

## Metrics (stable names/tags)

- `rag.embedder` (counter + latency): success/failure via `recordOperation`, `recordLatency` with tag `component=rag`
- `rag.store` (counter + latency): success/failure via `recordOperation`, `recordLatency` with tag `component=rag`
- Optional future metrics:
  - `rag.reranker` (planned)
  - `rag.generate`, `rag.chunk`, `rag.ingest`

## Suggested SLOs

- Availability (monthly):
  - Embedder success rate >= 99.0%
  - Store query success rate >= 99.5%
- Latency (p95):
  - Embedder call p95 < 800ms (local/MLX paths may be lower)
  - Store query p95 < 250ms (in-memory) / < 500ms (pgvector)

## Alert Rules (examples)

- Error budget burn: success rate drops < SLO for 10m rolling window
- Latency regression: p95 exceeds threshold for 15m window

## Dashboard Outline

1) Edge Health
   - Success rate (embedder/store)
   - p50/p95/p99 latency (embedder/store)
2) Throughput & Saturation
   - Calls/min, concurrency
3) Reliability Events
   - Retries count, breaker open state rate
4) Recent Changes
   - Releases/PRs linked via annotations

Note: Metric emission currently wired for `rag.embedder` / `rag.store`
via `RAGPipeline.runWithPolicies`. Extend similarly to reranker and other edges.
