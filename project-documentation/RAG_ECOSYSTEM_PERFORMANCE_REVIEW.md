# RAG Ecosystem Performance Review (2025-10-11)

## Summary
- **Ingestion and storage** currently process batches strictly sequentially, which turns every document upload into a round-trip per chunk and leaves throughput capped by the slowest dependency (vector DB or embedder).【F:packages/rag/src/rag-pipeline.ts†L300-L328】【F:packages/rag/src/store/pgvector-store.ts†L152-L181】
- **Retrieval flows** always serialize embedding → store query work and silently swallow downstream failures, which hides regressions while still consuming latency budgets and forcing repeat calls.【F:packages/rag/src/rag-pipeline.ts†L361-L396】【F:packages/rag/src/rag-pipeline.ts†L474-L487】【F:packages/rag/src/rag-pipeline.ts†L592-L598】
- **Pre-processing and HTTP entry points** copy entire payloads into memory, skip concurrency controls, and omit request deadlines, so large jobs can starve the event loop and prevent steady-state p95 targets.【F:packages/rag/src/lib/batch-ingest.ts†L43-L55】【F:packages/rag-http/src/server.ts†L88-L158】【F:packages/rag/src/chunkers/dispatch.ts†L250-L333】
- **Auxiliary controllers** (hierarchical store, self-RAG) hold unbounded in-memory state and run open-ended loops without budget enforcement, threatening memory pressure and tail latencies as knowledge bases scale.【F:packages/rag/src/store/hierarchical-store.ts†L23-L127】【F:packages/rag/src/self-rag/controller.ts†L74-L113】

## Observations

### Ingestion & Storage
- The core `RAGPipeline.ingest` path embeds and upserts synchronously. Each batch waits for the previous stage to finish before progressing, and success/failure metrics are only emitted after both steps complete.【F:packages/rag/src/rag-pipeline.ts†L300-L328】 This prevents overlapped compute vs I/O and exposes ingestion to single-resource stalls.
- `PgVectorStore.upsert` acquires one client and iterates `await client.query(...)` for every chunk inside the loop.【F:packages/rag/src/store/pgvector-store.ts†L152-L181】 With hundreds of chunks the connection remains busy for the full loop, negating pgvector's bulk-ingest strengths and keeping WAL fsyncs unbatched.
- `batch-ingest` workers load full files into memory with `fs.readFile` and then issue a single `pipeline.ingest` call per file.【F:packages/rag/src/lib/batch-ingest.ts†L43-L55】 Large PDFs or logs will spike RSS and still serialize chunk submission at the worker layer.
- Hierarchical context enrichment maintains a `Map` of every chunk ever upserted with no eviction, so stores backed by pgvector still duplicate the dataset in JS memory.【F:packages/rag/src/store/hierarchical-store.ts†L23-L127】 This grows linearly with corpus size and increases GC pauses during retrieval.

### Retrieval & Querying
- Retrieval pipelines always embed, query, post-process, and sanitize serially without concurrency. There is no prefetch of store results while sanitization executes, and the same embedder call is repeated for every cache route variant.【F:packages/rag/src/rag-pipeline.ts†L361-L396】【F:packages/rag/src/rag-pipeline.ts†L440-L472】
- `queryMaybeHybrid` is wrapped by `selfSafe`, so any store failure returns an empty result without surfacing errors. Downstream clients then retry the same request, incurring duplicate embedder work and inflating latency with zero signal to alerting.【F:packages/rag/src/rag-pipeline.ts†L474-L487】【F:packages/rag/src/rag-pipeline.ts†L592-L598】
- `PgVectorStore.hybridQuery` performs vector and keyword queries sequentially on the same connection and fuses the results in memory without reuse of the `withRetry` instrumentation, losing correlation IDs and doubling round-trip latency when hybrid search is enabled.【F:packages/rag/src/store/pgvector-store.ts†L233-L297】

### HTTP Surfaces & Controllers
- The Fastify server is created with default timeouts disabled and no per-route signal deadlines, so long-running ingest or self-RAG queries keep sockets open indefinitely and can block the worker pool.【F:packages/rag-http/src/server.ts†L88-L158】
- Self-RAG's control loop retries until quality thresholds are met but never enforces time budgets or iteration ceilings beyond `maxRounds`, so an expensive `runQuery` can elongate p95 latency with no telemetry on time spent per round.【F:packages/rag/src/self-rag/controller.ts†L74-L113】
- Processing dispatcher defaults to `enableParallel: false` and never branches on the flag, meaning every policy executes serial chunkers even when workloads are independent or I/O-bound.【F:packages/rag/src/chunkers/dispatch.ts†L250-L333】

## Recommendations

### Immediate (protect current SLOs)
1. **Batch database writes and add per-stage timers**: convert `PgVectorStore.upsert` to bulk `INSERT ... SELECT` (or PostgreSQL `COPY`) inside a single transaction, and emit stage timings for embed vs store so ingest alerts can pinpoint saturation.【F:packages/rag/src/rag-pipeline.ts†L300-L328】【F:packages/rag/src/store/pgvector-store.ts†L152-L181】
2. **Stop silent fallbacks on store failures**: replace `selfSafe` with retry-and-escalate semantics that short-circuit before rerunning the full pipeline. Surface structured errors so clients can back off instead of thrashing the embedder.【F:packages/rag/src/rag-pipeline.ts†L474-L487】【F:packages/rag/src/rag-pipeline.ts†L592-L598】
3. **Apply request deadlines & concurrency guards**: configure Fastify's `connectionTimeout`/`bodyLimit`, wrap ingest/query handlers with `AbortController`, and cap simultaneous self-RAG executions to avoid event-loop starvation.【F:packages/rag-http/src/server.ts†L88-L158】【F:packages/rag/src/self-rag/controller.ts†L74-L113】

### Near Term (expand throughput)
1. **Introduce streaming chunk pipelines**: refactor batch ingest workers to stream file reads and feed chunks through an async generator so embedding can start before full file load, paired with bounded worker pools keyed by byte size.【F:packages/rag/src/lib/batch-ingest.ts†L43-L55】
2. **Parallelize hybrid search fusion**: run vector and keyword queries via `Promise.all` using separate clients, cache intermediate scores, and reuse `withRetry` to preserve observability metadata.【F:packages/rag/src/store/pgvector-store.ts†L233-L297】
3. **Add adaptive caching for hierarchical metadata**: move the `Map` into an LRU keyed by workspace/document and persist parent metadata in the vector store so context expansion does not duplicate the corpus in JS memory.【F:packages/rag/src/store/hierarchical-store.ts†L23-L127】

### Longer Term (scalability roadmap)
1. **Pipeline micro-batching**: allow `RAGPipeline.ingest` to push sanitized chunks into an internal queue that coalesces embeddings across documents, improving GPU utilization for larger models.【F:packages/rag/src/rag-pipeline.ts†L300-L328】
2. **Observability budgets for self-RAG**: record per-round latency, retrieval cost, and critique counts, and enforce cumulative latency budgets so controllers can degrade gracefully when retrieval slows.【F:packages/rag/src/self-rag/controller.ts†L74-L113】
3. **Policy-driven parallel chunking**: implement the dormant `enableParallel` flag by running independent chunkers in worker threads and measuring chunk-per-second throughput, providing back-pressure hooks to ingest.【F:packages/rag/src/chunkers/dispatch.ts†L250-L333】

## Suggested Next Steps
- Prototype a batched `pgvector` ingest path behind a feature flag, capture before/after ingest metrics, and validate WAL/CPU utilization improvements in staging.
- Add error-budget aware retries for retrieval and confirm downstream clients surface actionable errors in integration tests.
- Define SLIs for self-RAG rounds and hierarchical context cache size, then wire dashboards/alerts to catch regressions as corpora grow.
