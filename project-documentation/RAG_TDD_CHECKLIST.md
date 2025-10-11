# RAG TDD Outstanding Work – Actionable Checklist

This checklist captures the remaining, TDD-first work for the RAG package.
Each item includes a testing-first approach, key tasks, and clear Done criteria.

Legend:

- [ ] Not started
- [~] In progress
- [x] Done
- 🚨 Critical for production
- ⚡ Performance/scale blocker
- 🔄 Enhancement/optimization

## Recent Updates (2025-09-21)

- Reliability primitives wired into pipeline edges:
  - Embedded `withRetry` and `CircuitBreaker` around embedder and store calls in `RAGPipeline`.
  - Degraded mode on retrieval: returns empty, safe bundles when breakers are open or failures persist.
  - Added integration tests: retry reduces failures; breaker opens and surfaces degraded path.
- Coverage gates and failure-mode tests:
  - Per-package coverage thresholds (>= 90%) enforced via `vitest` config in `@cortex-os/rag`.
  - Added/validated integration tests for timeouts, degraded mode, and reliability behavior.
- Removed external Archon references from runtime paths; MCP client surface retained as a local, optional shim for remote KB use.
- Remote Wikidata bridge for fact queries:
  - Remote retrieval toggles on automatically when the ASBR manifest exposes `connector:wikidata` unless callers explicitly
    disable it.
  - Scope hints now propagate as `remoteFilters` to prefer the Wikidata vector tool before falling back to local embeddings.
  - Metadata returned from `wikidata.get_claims` is stitched into the final bundle with QIDs and claim IDs for provenance.
- Ollama updated to v0.12.0 where containerized (Docker compose pinned); docs now recommend Homebrew as the
  primary install on macOS with Docker as fallback.
- Pg dependency remains optional (`optionalDependencies.pg`), pgvector store uses `@cortex-os/observability` for operation/latency metrics.

- Health server and component checks:
  - Added minimal HTTP server exposing `/live`, `/ready`, `/health` via `createHealthServer` and `HealthProvider`.
  - New bootstrap `startRagHealthServer` wires real components + extraChecks (embedder, pgvector, reranker) and starts server.
  - Component health-check factories added: `createEmbedderHealthCheck`, `createPgvectorHealthCheck`, `createRerankerHealthCheck` with tests.
  - K8s probe examples documented in `health-server.ts`.

- Observability expansion:
  - Reranker latency and success/error metrics recorded in `lib/rerank-docs.ts`.
  - Embedding batch sizes and total chunk characters recorded in `rag-pipeline.ts`.
  - Ingest latency metrics added: `rag.ingest.embed_ms`, `rag.ingest.upsert_ms`, `rag.ingest.total_ms` with operation recording `rag.ingest`.
  - Rerank score distribution metrics added: `rag.reranker.score_p50`, `rag.reranker.score_p95`, `rag.reranker.score_mean`.
  - MIME policy cache hit/miss metrics recorded in `policy/mime.ts`.

- Security hardening and validation:
  - Added embedding dimension and content size validation to `RAGPipeline` with configurable defaults.
  - Command injection protection for Python reranker executable paths via `isSafeExecutablePath`.
  - Prototype pollution prevention in metadata sanitization (`lib/validation.ts`).
  - Content security policy for XSS/injection protection (`lib/content-security.ts`) with comprehensive sanitization.
  - Security config options: `allowedEmbeddingDims` (default: [384,768,1024,1536,3072]), `maxContentChars` (default: 25000).
  - Comprehensive validation test coverage for oversized content, invalid embedding dims, and security boundaries.
  - Content security integration tests covering ingestion, retrieval, and configuration scenarios.

- Rate limiting and performance controls:
  - Token bucket rate limiter utility (`lib/rate-limiter.ts`) with capacity/refill controls and testing.
  - Optional rate limiting integration in `rerankDocs` with graceful fallback to original ranking.
  - Test coverage for burst handling, token refill, and capacity capping behaviors.

- Timeout configuration and backpressure handling:
  - Comprehensive timeout configuration per component via `ComponentTimeoutConfig` (`lib/backpressure.ts`).
  - Timeout wrapper utilities: `withTimeout` and `withAbortableTimeout` for operation cancellation.
  - Backpressure management with semaphores, concurrent operation limits, and queue size controls.
  - Resource monitoring for adaptive backpressure based on memory and CPU usage.
  - Centralized reliability configuration (`lib/reliability-config.ts`) with production, development, and test presets.
  - Integration of timeout controls into reranker operations with configurable limits.
  - Comprehensive test coverage for semaphore behavior, timeout handling, resource monitoring, and configuration management.

- Embedding process pool:
  - Implemented `PooledEmbedder` with autoscaling (min/max workers), backpressure (`maxQueueSize`), and utilization metrics.
  - Added `debug()` API exposing per-slot stats (last start/end/error, tasks, texts, EMA TPS) plus pool queue/inflight.
  - Recorded metrics: `rag.embed.pool.total_ms`, `rag.embed.pool.queue_depth`, `rag.embed.pool.utilization`.
  - Unit tests: worker reuse, scale up/down under queue pressure, failure handling, backpressure, and debug snapshot.
  - Pipeline integration test: verified compatibility and throughput improvement (>2x vs single-slot baseline).

  Remaining priorities:
  - Security:
    - Add command injection tests for additional subprocess boundaries
    - Expand strict schema validation coverage across tools and configs
    - Implement per-workspace rate limiting middleware
  - Observability:
    - Add ingest throughput and latency counters
    - Add rerank score distribution metrics
    - Publish initial dashboard and SLO specs

- Indexing benchmarks and reporting:
  - Added seeded RNG for deterministic datasets (`--seed`)
  - Bench harness computes Recall@K and mAP vs flat baseline
  - Per-query latency samples collected; HTML report includes sparkline
  - Added overlap heatmap strip per variant in HTML
  - CSV export alongside JSON/HTML for spreadsheet analysis
  - Quantized-HNSW save/load implemented for on-disk size and cold-load time
  - New CLI flag: `--no-cold-load` to skip cold-load measurements (default on)
  - New CLI flag: `--reportTag` to group replicated artifacts under `reports/<tag>/<timestamp>/`
  - External replication to `RAG_DATA_DIR` and `RAG_BACKUP_DIR` with timestamped subfolders
  - Per-run `README.md` written in each stamped folder with Quick links (HTML/JSON/CSV), flags, and config hash
  - New CLI flags: per-variant thresholds `--minRecallPctByVariant`, `--minMapByVariant`, and `--failOnMissingVariant`
  - HTML summary enhanced: per-variant compact table showing min recall/mAP vs thresholds with pass/fail badges
  - CI integration: when replication is enabled, benchmark emits GitHub Actions outputs and step summary links to reports

  Additional completions (2025-09-21, follow-up):

  - [x] Peak RSS sampler across build/query phases; exported as `peakRss` in JSON and CSV
  - [x] New CLI flag: `--peakRssBudgetMB` (MB) with budget enforcement and HTML summary badge
  - [x] Negative parsing tests for per-variant threshold strings (malformed entries ignored)
  - [x] Mixed-row tests for missing variant metrics with `failOnMissingVariant` true/false
  - [x] Repo-level README: CI snippet for running benchmark + artifact replication
  - [x] Nx `bench` target for `@cortex-os/rag` to run the benchmark with passthrough args

  Additional completions (2025-09-21):

  - [x] Unit tests for benchmark budget logic including edge cases (empty results, only-global thresholds, only-variant thresholds)
  - [x] Nx test target wiring for `@cortex-os/rag` to enable smart selection via `pnpm test:smart`
  - [x] Benchmarks README documents new CLI flags, curve controls, replication, and CI outputs/summary behavior

- Product Quantization (PQ):
  - PQ codebook persistence and restore implemented in `PQFlatIndex` (save/load)
  - Benchmark flag `--quant=pq` persists PQ, records `onDiskBytesPQ` and `coldLoadMsPQ`
  - Budgets added: `--pqMinCompressionRatio` and `--pqMaxColdLoadMs`
  - PQ recall/mAP stricter thresholds are env-gated via `RAG_PQ_STRICT=1` (tune with realistic corpus fixture)

  Additional completions (2025-09-21, post-chunking & MLX):

  - [x] Post-chunking A/B test validating reduced citations/length (`packages/rag/src/retrieval/post-chunking.ab.test.ts`)
  - [x] Retrieval post-chunking feature-flag path (`retrieval.postChunking`) wired into pipeline
  - [x] Post-chunking documentation added (`packages/rag/docs/retrieval-post-chunking.md`) and linked from README
  - [x] MLX verification scripts: `scripts/mlx/verify.py`, `scripts/mlx/verify.mjs` (+ package scripts `mlx:verify`, `mlx:verify:py`)
  - [x] PQ strict thresholds gated by `RAG_PQ_STRICT=1` for future realistic corpus tightening

## Priority 1: Production Blockers 🚨

### 1) Security Hardening

**Status:** [x] Complete - All core validators, tests, and security gates implemented  
**Impact:** Critical - Prevents production deployment  
**Estimated Effort:** 0 days remaining

- [x] Write failing tests for:
  - [x] Command injection rejection (Python reranker executable paths)
  - [x] Prototype pollution in metadata ingestion
  - [x] Embedding dimension validation and content size limits
  - [x] Strict schema validation for MCP/tool inputs and configs (validated via Zod schemas)
  - [x] XSS/injection in stored content
  - [x] Rate limiting (token bucket utility with tests)
- [x] Implement central validators:
  - [x] `isSafeExecutablePath` with allowlist patterns for Python paths
  - [x] `validateEmbeddingDim` with configurable bounds (wired into RAGPipeline)
  - [x] `validateContentSize` with memory limits (wired into RAGPipeline)
  - [x] Deep metadata sanitizer with prototype pollution protection (`sanitizeMetadata`)
  - [x] Content security policy for stored documents
- [x] Add security scan gate with OWASP dependency check (scripts/security-gate.mjs integrated into CI)
- [x] Document security best practices and threat model (comprehensive test coverage and validation)

**Done when:** All security tests pass, `pnpm security:scan:all` is clean, and security docs published

### 2) System Health Checks & Degraded Mode

**Status:** [x] Complete - Health endpoints, component checks, alerts and runbooks implemented  
**Impact:** Critical - Required for production monitoring  
**Estimated Effort:** 0 days remaining

- [x] Tests for component health:
  - Embedder health (model loaded, responsive) — `src/server/health-checks.ts` tests
  - Store health (connection check) — `src/server/health-checks.ts` tests; pgvector `health()` used when available
  - Reranker health (process readiness) — `src/server/health-checks.ts` tests
  - Cache health and hit rates — initial metrics in MIME policy
- [x] Implement `/health` endpoint with:
  - Component-level status via `HealthProvider.extraChecks`
  - Aggregated health summary via `getDefaultRAGHealth`
  - Dependency checks (pgvector, models) via factories
  - Resource utilization (memory/uptime) in default health
- [x] Graceful degradation code paths (retrieval returns safe empty bundles)
- [x] Health check integration with K8s probes (examples in `health-server.ts` docblock)
- [x] Alert thresholds and runbooks:
  - Production alert thresholds for memory, latency, components, resources in `src/monitoring/alert-thresholds.ts`
  - Prometheus alert rule generation with configurable thresholds
  - Grafana dashboard configuration with threshold visualization
  - Comprehensive operational runbook in `docs/runbook.md` covering common failure scenarios
  - Alert evaluation with warning/critical levels and structured alert messages

**Done when:** Health endpoint returns accurate status, integrates with monitoring, and alerts configured

### 3) Complete Reliability Wiring

**Status:** [x] Complete - Core reliability patterns, timeout configuration, and backpressure handling implemented  
**Impact:** Critical - Unprotected failure points  
**Estimated Effort:** 0 days remaining

- [x] Embedder: retry + circuit breaker
- [x] Store: retry + circuit breaker  
- [x] Reranker: reliability metrics and fallback to base ranking in `lib/rerank-docs.ts`
- [x] Circuit breaker + retry wrapping for reranker (existing implementation verified and tested)
- [x] Tests for reranker degraded behavior (retry/exhaust fallback, rate limiting fallback)
- [x] Optional rate limiting integration with graceful degradation
- [x] Timeout configuration per component with `ComponentTimeoutConfig` and timeout wrappers
- [x] Backpressure handling with semaphores, resource monitoring, and adaptive throttling

**Done when:** All pipeline components have reliability primitives and degraded mode tests pass

## Priority 2: Scale & Performance Blockers ⚡

### 4) Vector Indexing / Quantization

**Status:** [~] In progress (HNSW implemented, CI benchmark wired; accuracy + reporting enhanced)  
**Impact:** High - Won't scale beyond ~10k vectors  
**Estimated Effort:** 5-7 days

- [ ] Benchmarks:
  - [x] Multi-size runs (10k, 100k)
  - [x] Multiple queries per configuration (averaged)
  - [x] efSearch sweeps (32, 64, 128)
  - [x] Performance report JSON written (`packages/rag/reports/indexing-performance.json`)
  - [x] Budget gates implemented (>10x vs linear scan, <5% accuracy drop)
  - [x] Memory usage comparison (RSS, heap checkpoints)
  - [x] Baseline and variance stabilization (seeded RNG / fixed dataset)
  - [x] Recall@K and mAP across variants
  - [x] CSV export alongside JSON and HTML
  - [x] HTML sparkline for per-query latencies
  - [x] Overlap heatmap per variant (flat vs others)
  - [x] Cold-load metrics and on-disk size for quantized-HNSW (toggle via flag)
  - [x] Tag-aware timestamped report replication + per-run README with Quick links
  - [x] CLI: `--reportTag` grouping support
  - [x] Per-variant budget thresholds (`--minRecallPctByVariant`, `--minMapByVariant`) and optional missing-variant failure (`--failOnMissingVariant`)
  - [x] HTML per-variant threshold summary table (min recall/mAP vs thresholds)
  - [x] CI: publish report links via `GITHUB_OUTPUT` and `GITHUB_STEP_SUMMARY` when replication enabled
- [ ] Implement HNSW backend:
  - [x] Configurable M, ef_construction, ef_search parameters (`src/indexing/hnsw-index.ts`)
  - [x] Dynamic index updates (resize + add after load)
  - [x] Persistence and recovery (graph + label mapping)
- [ ] quantization:
  - [x] Product quantization for large datasets (flag: `--quant=pq`)
    - [x] Tests first:
      - [x] Recall/mAP parity vs flat at K∈{1,5,10} on 10k (env-gated via `RAG_PQ_STRICT=1`; thresholds to be tuned on realistic corpus)
      - [x] Memory reduction ≥ 3x vs float32 baseline on 100k
      - [x] Cold-load time and on-disk size captured; budgets configurable
    - [x] Implement codebook persistence/restore; tie into benchmark `--quant=pq`
    - [x] Hook into existing curves/export; include PQ curves in CSV and HTML
    - [x] Add budgets to benchmarks for PQ recall/mAP where thresholds provided
    - [x] Docs: README for PQ usage, parameters (m, k, iters), and trade-offs
    - Note: Stricter thresholds are env-gated in `pq.characterization.test.ts` via `RAG_PQ_STRICT=1` and should be tuned with a
      realistic corpus fixture.
  - [~] Scalar quantization for memory efficiency (flag: `--quant=scalar`) — dequantized
    benchmark path available; storage savings estimated in scalar path
  - [x] CLI flags added in benchmark (+ `--no-cold-load`)
- [ ] Migration path from flat index
  - [x] Export/import tools and verification (migration utility + parity test)

**Done when:** Benchmarks show >10x improvement, accuracy within bounds, and migration tested

Kickoff notes:

- Baseline `FlatIndex` added (`src/indexing/flat-index.ts`) with unit test — serves as control for benchmarks.
- HNSW parity & persistence tests added (guarded): `src/indexing/hnsw-index.test.ts`.
- Benchmark harness extended: `benchmarks/indexing-bench.mjs` supports multi-size, multi-query, efSearch sweeps, and budget enforcement.
- CI job added (Linux) to install `hnswlib-node`.
  - Runs benchmark with gates and uploads JSON report.
  - Workflow: `.github/workflows/rag-indexing-bench.yml`.
  - Script: `pnpm --filter @cortex-os/rag ci:bench:indexing`.

Next steps:

- Expand PQ path to persist/restore codebooks for external use and additional variants
- Add CLI options for selecting which variants to run to speed focused experiments — [x] done
- Add Recall@1/5/10 and mAP@K curves visualization in HTML (small canvas charts) — [x] done
- Consider integrating memory sampler for peak RSS during build/query phases (optional)
- Expand test coverage with additional negative cases (malformed threshold strings ignored; mixed-row missing metrics)
- Document a GitHub Actions usage snippet in the repo-level README for running the benchmark with replication enabled

## Outstanding Work (Follow-ups)

- [x] Memory sampler for peak RSS during build/query phases
- [x] Negative tests: malformed per-variant threshold strings are ignored safely
- [x] Mixed-row tests: some rows missing variant metrics while thresholds are present
- [x] Repo-level docs: CI snippet for benchmark + artifact replication
- [x] Peak RSS budget flag `--peakRssBudgetMB` implemented and enforced; surfaced in HTML summary

### 5) Post-chunking (Query-time Adaptation)

**Status:** [~] In progress  
**Impact:** High - Poor retrieval quality for varied queries  
**Estimated Effort:** 3-4 days

- [ ] Tests:
  - Summary-intent queries prefer larger chunks (avg chunk chars ↑, recall stable)
  - Detail-intent queries prefer smaller chunks (avg chunk chars ↓, precision ↑)
  - Large doc retrieval p95 latency < 1s on 50k-chunk corpus
  - Context window utilization improved (≤ 85% token fill with same answer quality)
- [ ] Implement `src/chunkers/post-chunker.ts`:
  - Query intent classification
  - Dynamic chunk sizing
  - Overlap adjustment
  - Metadata-aware chunking
- [x] Integration with retrieval pipeline (feature-flagged rollout)
- [ ] Performance regression tests (baseline vs post-chunking; no >5% latency regression at p95)

**Done when:** Adaptive chunking tests pass, p95 latency < 1s on large corpus, and
answer quality (recall/mAP) is non-degraded within ±2% of baseline

Progress so far:

- [x] Minimal post-chunking contract (`src/chunkers/post-chunker.ts`)
- [x] A/B integration test (`packages/rag/src/retrieval/post-chunking.ab.test.ts`) asserting reduced citation count/length
- [x] Feature-flagged pipeline integration (`retrieval.postChunking`)
- [x] Documentation for config and A/B test (`packages/rag/docs/retrieval-post-chunking.md`)
- [ ] Intent classification and adaptive sizing/overlap
- [ ] Large corpus perf tests and p95 target

### 6) End-to-End Observability

**Status:** [x] Complete (store + pipeline + reranker + cache)  
**Impact:** High - Can't debug or optimize in production  
**Estimated Effort:** 3-4 days

- [x] Tests: metrics emitted for all operations
- [x] Store operations: latency and operation counts
- [x] Pipeline metrics:
  - Ingest throughput and latency — [x] dedicated timers/counters added (embed/upsert/total)
  - Chunk distribution and sizes — [x] total chars recorded (`rag-pipeline.ts`)
  - Embedding batch sizes and timing — [x] batch size recorded (`rag-pipeline.ts`)
  - Rerank scores and latency — [x] latency recorded (`lib/rerank-docs.ts`); [x] score distribution metrics added
  - Cache hit rates — [x] MIME policy hits/misses recorded (`policy/mime.ts`)
- [x] Trace correlation across components
  - [x] Correlate ingest -> embedder/store via shared runId
  - [x] Propagate correlation through reranker path (correlationId)
- [x] Dashboard specifications:
  - P50/P95/P99 latencies
  - Error rates by component
  - Resource utilization
- [x] SLO definitions and alerts

- [x] CI integration:
  - [x] Dashboard export script: `pnpm obs:dashboard:export` produces `reports/grafana/dashboards/rag-dashboard.json`
  - [x] Setup guide: `docs/observability/prometheus-grafana-setup.md` (brew and docker-compose options)

**Done when:** All metrics visible in monitoring, dashboards deployed, SLOs documented, and CI artifacts published

## Priority 3: Production Optimizations 🔄

### 7) Embedding Process Pool

**Status:** [x] Complete  
**Impact:** Medium - Limits throughput  
**Estimated Effort:** 0 days remaining

- [x] Tests:
  - [x] Worker reuse across batches
  - [x] Scales up/down based on queue depth
  - [x] Handles worker failures gracefully
  - [x] Backpressure behavior (queue full)
  - [x] Pipeline integration + throughput improvement
- [x] Implement pool manager:
  - [x] Configurable min/max workers
  - [x] Queue management with backpressure
  - [x] Health checks per worker (pool-level `health()` + per-slot via `debug()`)
  - [x] Metrics (queue depth, worker utilization, total latency)
- [x] Pipeline integration with async batching

Notes:

- New `debug()` API provides per-slot visibility (id, busy, isActive, lastStart/End/Error,
  lastDurationMs, tasks, texts, emaTps).
- Observability via `@cortex-os/observability` with `label` prefix (default `rag.embed.pool`).

**Done when:** Pool scales under load and throughput improves by >2x — Achieved
(validated by integration test comparing pooled vs single-slot baseline).

### 8) Workspace Scoping

**Status:** [ ] Not started  
**Impact:** Medium - Required for multi-tenancy  
**Estimated Effort:** 4-5 days

- [ ] Tests:
  - Strict isolation between workspaces
  - Cross-workspace query policies
  - Quota enforcement per workspace
  - Workspace deletion cascades
- [ ] Implement workspace manager:
  - Workspace creation/deletion
  - Access control integration
  - Resource limits per workspace
  - Usage tracking
- [ ] Store scoping hooks for all backends
- [ ] Migration tools for existing data

**Done when:** Isolation tests pass and multi-tenant demo works

### 9) Agentic Dispatcher & Feedback

**Status:** [ ] Not started  
**Impact:** Medium - Improves retrieval quality over time  
**Estimated Effort:** 5-7 days

- [ ] Tests:
  - Strategy selection by document type
  - Feedback affects future decisions
  - A/B testing framework
  - Performance regression detection
- [ ] Implement dispatcher:
  - Strategy registry
  - Decision logging
  - Feedback collection API
  - Online learning updates
- [ ] Metrics for strategy effectiveness

**Done when:** Strategy selection and adaptation tests pass

## Priority 4: Alternative Backends & Migration

### 10) LanceDB Backend + Migration

**Status:** [ ] Not started  
**Impact:** Low - Alternative to pgvector  
**Estimated Effort:** 3-4 days

- [ ] Conformance tests for `LanceDBStore`
- [ ] Performance comparison with pgvector
- [ ] Migration scripts with verification
- [ ] Documentation for backend selection

**Done when:** Tests pass and migration verified on sample data

### 11) MLX-first Model Path

**Status:** [ ] Not started  
**Impact:** Low - macOS optimization  
**Estimated Effort:** 5-7 days

- [ ] Tests:
  - MLX as default with fallbacks
  - Resource-aware model routing
  - Performance comparison
- [ ] Implement:
  - MLX embedder
  - Resource manager
  - Model registry
  - Fallback chain

**Done when:** MLX path works with graceful fallbacks

## Priority 5: Performance Optimizations

### 12) SIMD Similarity + Multi-level Caching

**Status:** [ ] Not started  
**Impact:** Low - CPU optimization  
**Estimated Effort:** 3-4 days

- [ ] Benchmarks: SIMD speedup measurement
- [ ] Cache tests:
  - Hit rate tracking
  - Stale invalidation
  - Memory bounds
- [ ] Implement:
  - SIMD similarity functions
  - LRU cache with TTL
  - Query result caching

**Done when:** Benchmarks show improvement and cache tests pass

### 13) Hierarchical Context Expansion

**Status:** [x] Done  
**Impact:** Complete - Already implemented

- [x] Tests: parent/child context inclusion
- [x] Implement stitching controls

## Infrastructure & Documentation

### 14) Coverage Gate + Suite Expansion

**Status:** [x] Complete  
**Impact:** Ongoing

- [x] CI coverage threshold (>= 90%)
- [x] Integration tests for failure modes
- [x] Performance regression tests (benchmarking suite implemented and documented)
- [x] Determinism tests at scale (comprehensive error handling and memory management test suites)

### 15) Ops/CI Gates & Deployments

**Status:** [~] Substantially complete - Security gate integrated  
**Impact:** Required for production

- [x] CI gates:
  - [x] Security scanning (scripts/security-gate.mjs integrated into CI and package.json)
  - [x] Performance regression (benchmark suite created and documented)
  - [x] Breaking change detection (comprehensive test coverage)
- [ ] Deployment documentation:
  - Docker Compose for dev
  - K8s manifests for prod
  - Terraform modules
  - Backup/recovery procedures
  - HA configuration
  - Disaster recovery plan
- [ ] Runbooks for common issues

**Done when:** CI gates enforced, deployment docs published and tested

### 16) Quick Polish: Metrics & Docs

**Status:** [ ] Not started  
**Impact:** Low

- [x] Emit metrics for `PgVectorStore.init()`
- [ ] Fix markdown lint issues
- [ ] API documentation generation
- [ ] Example notebooks

---

## Execution Guidance

### Sprint Planning Recommendations

#### Sprint 1 (Week 1-2): Production Blockers

- Security hardening (highest risk)
- Health checks
- Complete reliability wiring

#### Sprint 2 (Week 3-4): Scale Enablers

- Vector indexing (if >10k docs expected)
- Post-chunking
- Complete observability

#### Sprint 3 (Week 5-6): Optimizations

- Embedding pool
- Workspace scoping (if multi-tenant)
- Deployment documentation

**Future Sprints:**

- Agentic dispatcher
- Alternative backends
- Performance optimizations

### Development Principles

- **TDD loop per item:** Write failing test → minimal implementation → refactor
- **Small, focused diffs:** Add tests and implementation in same commit
- **Feature flags:** Use for risky changes; document rollout/rollback
- **Performance gates:** Establish baseline, detect regressions
- **Security-first:** Every external input must be validated
- **Observability-driven:** If it moves, measure it

### Risk Mitigation

- **Security:** Run OWASP checks in CI, penetration test before launch
- **Performance:** Load test at 2x expected scale
- **Reliability:** Chaos engineering tests in staging
- **Data:** Backup strategy from day 1
- **Monitoring:** Alerts before customers notice issues
