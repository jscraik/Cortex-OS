# Research Document: RAG Ecosystem Performance Review

**Task ID**: `packages-rag-performance-review`
**Created**: 2025-10-13
**Researcher**: AI Agent (gpt-5-codex)
**Status**: Complete

---

## Objective

Evaluate the packages/rag ecosystem for throughput and latency bottlenecks across ingestion, retrieval, reranking, and HTTP orchestration surfaces so that follow-on implementation work can prioritize the highest-impact performance improvements without violating brAInwav governance.

---

## Current State Observations

### Existing Implementation
- **Location**: `packages/rag/src/pipeline/ingest.ts`
- **Current Approach**: Documents are chunked synchronously, embedded in a single bulk `embed` call, and written to the backing store with `store.upsert`.
- **Limitations**:
  - Entire document text, chunk metadata, and embedding vectors are held in memory simultaneously, which spikes heap usage for large uploads.
  - `store.upsert` is awaited once per ingest with no batching/backpressure controls, so large payloads can monopolize the store connection and block concurrent writers.
  - Embedding retries rely solely on upstream `withRetry` defaults, leaving ingestion susceptible to cascading failures under transient model latency.

- **Location**: `packages/rag/src/store/hierarchical-store.ts`
- **Current Approach**: Wraps an underlying vector store and keeps an in-memory `Map` of every chunk to synthesize hierarchical context on retrieval.
- **Limitations**:
  - `byId` grows without eviction or size caps, so long-running processes leak memory and defeat the 256 MB budget.
  - Context enrichment happens synchronously during every query, so a single slow metadata chain can throttle high-volume lookups.
  - No instrumentation exists around cache hit/miss ratios or expansion depth, making it difficult to tune defaults.

- **Location**: `packages/rag/src/pipeline/qwen3-reranker.ts`
- **Current Approach**: Spawns a Python subprocess for each rerank batch, streams JSON, and parses scores in userland.
- **Limitations**:
  - Sequential loop over batches means reranking is effectively single-threaded and constrained by Python startup latency.
  - Per-request process spawning thrashes OS resources and erodes cold-start SLOs.
  - Timeout defaults (30 s) lack adaptive scaling, risking hung child processes during load spikes.

- **Location**: `packages/rag/src/lib/retrieve-docs.ts`
- **Current Approach**: Lazily embeds missing documents one by one using the live embedder before computing cosine similarity.
- **Limitations**:
  - Multiple serial `embed` calls for the same query bypass batching, magnifying latency on remote models.
  - Recomputed embeddings are not cached, so repeated queries thrash the embedding backend.

- **Location**: `packages/rag/src/enhanced-pipeline.ts`
- **Current Approach**: Constructs new embedder, reranker, and generator instances every time `createEnhancedRAGPipeline` is invoked.
- **Limitations**:
  - Re-initializing heavyweight models increases cold-start latency and duplicates resource downloads, especially for MLX-hosted artifacts.
  - No pooling or dependency injection means consumers cannot share model instances across requests.

### Related Components
- **packages/rag-http/src/server.ts**: HTTP controller serializes ingestion/retrieval calls onto a single pipeline instance without explicit concurrency controls, so slow responses cause head-of-line blocking.
- **packages/observability/**: Metric helpers exist (`recordLatency`, `recordOperation`), but RAG pipelines do not emit high-cardinality labels for chunk counts, batch sizes, or reranker timings.

### brAInwav-Specific Context
- **MCP Integration**: RAG exposes MCP tools through `packages/rag/src/mcp`, but tool handlers call the same synchronous pipeline operations, so MCP traffic inherits the same bottlenecks.
- **A2A Events**: Retrieval events are published without backpressure coordination, risking queue buildup if ingestion lags.
- **Local Memory**: Hierarchical store metadata is relied on for local memory expansions; runaway `byId` growth will degrade semantic memory serving.
- **Existing Patterns**: Other performance reviews (A2A, connectors) demonstrate effective async refresh loops and worker pooling strategies that can be ported here.

---

## External Standards & References

### Industry Standards
1. **OpenTelemetry Spec 1.28**
   - **Relevance**: Defines tracing and metric cardinality best practices needed to observe ingestion/reranking latency.
   - **Key Requirements**:
     - Use attribute limits to prevent high-cardinality leaks.
     - Emit span links for asynchronous batch work.

2. **MLOps Model Serving Patterns (2025)**
   - **Relevance**: Captures modern recommendations for batching and pooling inference workloads (embedding/reranking) to maintain throughput.
   - **Key Requirements**:
     - Share model weights across requests.
     - Apply adaptive batching and worker warm pools.

### Best Practices (2025)
- **Vector Store Ingestion**: Adopt streaming chunk pipelines with bounded concurrency and checkpointing to protect write latency.
  - Source: Pinecone Engineering Playbook 2025.
  - Application: Replace synchronous `ingestText` flow with async iterators, chunk-level backpressure, and cancellation support.
- **Hybrid CPU/GPU Utilization**: Keep long-lived worker pools for Python rerankers to amortize startup costs.
  - Source: NVIDIA Inference at Scale Whitepaper (2025).
  - Application: Pre-warm Qwen3 workers and use message queues for scoring tasks.

### Relevant Libraries/Frameworks
| Library | Version | Purpose | License | Recommendation |
|---------|---------|---------|---------|----------------|
| `p-limit` | 5.x | Bound concurrency for ingestion/rerank tasks | MIT | ✅ Use |
| `bullmq` | 5.x | Redis-backed worker queues for reranker pooling | MIT | ⚠️ Evaluate |
| `@opentelemetry/instrumentation-http` | 0.53.x | HTTP auto-instrumentation for latency tracing | Apache-2.0 | ✅ Use |

---

## Technology Research

### Option 1: Bounded Async Ingestion Pipeline

**Description**: Refactor `ingestText` into an async generator that streams chunks to a concurrency-limited embed queue, batches store writes, and exposes progress instrumentation.

**Pros**:
- ✅ Stabilizes memory usage by processing small chunk windows.
- ✅ Enables cancellation/resume semantics for long ingests.
- ✅ Provides natural hooks for emitting per-chunk metrics.

**Cons**:
- ❌ Requires wider refactor touching callers across MCP and HTTP surfaces.
- ❌ Needs retry-aware queues to preserve ordering guarantees.

**brAInwav Compatibility**:
- Aligns with Constitution guardrails on resource isolation.
- Allows per-workspace concurrency caps that honor policy budgets.
- Store write batching must respect security audit logging.

**Implementation Effort**: Medium

---

### Option 2: Reranker Worker Pool with Adaptive Batching

**Description**: Replace per-request Python spawning with a Node-managed worker pool that routes rerank jobs to long-lived Python processes supporting dynamic batch sizing.

**Pros**:
- ✅ Eliminates cold-start latency for repeated rerank calls.
- ✅ Unlocks higher throughput by letting workers batch multiple queries.
- ✅ Simplifies timeout/health monitoring via heartbeats.

**Cons**:
- ❌ Requires process supervision and recovery strategy.
- ❌ Introduces cross-language IPC channel that must be hardened.

**brAInwav Compatibility**:
- Must integrate with existing observability and policy logging.
- Pool sizing must respect 256 MB memory limit; may need cgroup enforcement.

**Implementation Effort**: Medium-High

---

### Option 3: Hierarchical Store Cache Hygiene & Telemetry

**Description**: Add size-aware eviction, background refresh jobs, and detailed metrics for the in-memory hierarchy map to keep retrieval fast and predictable.

**Pros**:
- ✅ Prevents unbounded memory growth and protects latency budgets.
- ✅ Surfaces actionable telemetry (hit rate, expansion latency).
- ✅ Minimal disruption to downstream APIs.

**Cons**:
- ❌ Still depends on underlying store performance.
- ❌ Requires coordination with local memory consumers to handle eviction gracefully.

**brAInwav Compatibility**:
- Fully within package boundary; no policy concerns.
- Eviction strategy must preserve compliance logs for regulated workspaces.

**Implementation Effort**: Low-Medium

---

## Comparative Analysis

| Criteria | Option 1 | Option 2 | Option 3 |
|----------|----------|----------|----------|
| **Performance** | High gains for ingest throughput | High gains for rerank latency | Moderate gains for retrieval |
| **Security** | Requires careful audit logging | Requires hardened IPC | Minimal impact |
| **Maintainability** | Medium (complex pipeline) | Medium-Low (pool management) | High |
| **brAInwav Fit** | Strong | Medium | Strong |
| **Community Support** | Strong (Node async patterns) | Medium (custom solution) | Strong |
| **License Compatibility** | MIT/Apache dependencies | MIT + Redis (external) | MIT |

---

## Recommended Approach

Adopt a phased plan that first lands Option 1 (bounded async ingestion) and Option 3 (cache hygiene/telemetry) to stabilize memory and throughput, then pilot Option 2 within controlled environments. This sequence addresses the most acute bottlenecks—ingest head-of-line blocking and hierarchical-store memory leaks—while laying groundwork for reranker pooling once ingestion is resilient.

---

## Implementation Considerations

### Dependencies to Add
```json
{
  "dependencies": {
    "p-limit": "^5.0.0",
    "@opentelemetry/instrumentation-http": "^0.53.0"
  }
}
```

**License Verification Required**:
- [x] `p-limit` – MIT – ✅ Compatible
- [x] `@opentelemetry/instrumentation-http` – Apache-2.0 – ✅ Compatible

### Configuration Changes
- **File**: `packages/rag/project.json`
- **Changes**: Add targeted Nx tasks for `perf:test` and `perf:profile` to run streaming ingest benchmarks.
- **File**: `packages/rag/src/rag-pipeline.ts`
- **Changes**: Inject concurrency/queue settings via config with safe defaults (e.g., `maxConcurrentEmbeds`, `batchSize`).

### Database Schema Changes
- **Migration Required**: No
- **Impact**: Backing vector stores remain unchanged; only ingestion order and metadata caching behavior evolve.

### Breaking Changes
- **API Changes**: Introduce optional config flags; defaults maintain backward compatibility.
- **Migration Path**: Document new options in `README.md` and provide sample Nx profiles for operators.

---

## Timeline Estimate

| Phase | Effort | Description |
|-------|--------|-------------|
| **Setup** | 1 day | Benchmark current ingestion/rerank latency, add tracing scaffolding |
| **Core Implementation** | 3 days | Build async ingestion queue and cache eviction logic |
| **Testing** | 1 day | Extend unit/integration coverage, add perf harness |
| **Integration** | 1 day | Wire telemetry into observability stack, update MCP/HTTP handlers |
| **Documentation** | 0.5 day | Refresh README, runbooks, and operator guides |
| **Total** | 6.5 days | |

---

## Related Research

### Internal Documentation
- `project-documentation/RAG_PACKAGE_ENHANCEMENT_ANALYSIS.md`
- `project-documentation/MODEL_GATEWAY_ECOSYSTEM_PERFORMANCE_REVIEW.md`
- `project-documentation/CONNECTORS_ECOSYSTEM_PERFORMANCE_REVIEW.md`

### External Resources
- Pinecone Engineering Playbook 2025: Streaming Ingest Patterns.
- NVIDIA Inference at Scale (2025): Worker Pool Design.
- OpenTelemetry Spec 1.28: Metrics & Tracing Guidelines.

### Prior Art in Codebase
- **Similar Pattern**: `packages/connectors/src/registry/refresh-scheduler.ts`
  - **Lessons Learned**: Async refresh loops with bounded concurrency keep registry discovery responsive.
  - **Reusable Components**: Concurrency limiter helpers and telemetry hooks.

---

## Next Steps

1. **Immediate**:
   - [ ] Socialize findings with RAG maintainers (**[verify and insert correct channel here]**).
   - [ ] Capture baseline metrics for ingest latency and memory usage.

2. **Before Implementation**:
   - [ ] Get stakeholder approval on recommended approach.
   - [ ] Create TDD plan covering async ingestion queue and cache eviction.
   - [ ] Verify dependency licenses and security posture.
   - [ ] Persist research summary to local memory once connectivity is restored.

3. **During Implementation**:
   - [ ] Validate queue throughput under load tests.
   - [ ] Monitor worker pool health metrics.
   - [ ] Update this document with new data points if approaches shift.

---

## Appendix

### Code Samples

```typescript
import pLimit from 'p-limit';

const limit = pLimit(4);
await Promise.all(
  chunks.map((chunk) =>
    limit(async () => {
      const embedding = await embedder.embed([chunk.text]);
      await store.upsert([{ ...chunk, embedding: embedding[0] }]);
    }),
  ),
);
```

### Benchmarks

Pending — baseline latency collection scheduled during Setup phase.

### Screenshots/Diagrams

Not applicable for this research iteration.

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-13 | AI Agent (gpt-5-codex) | Initial research |

---

**Status**: Complete

**Stored in Local Memory**: No (sandbox connectivity limits prevented persistence)
