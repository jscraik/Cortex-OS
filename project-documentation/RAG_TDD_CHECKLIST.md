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

## Recent Updates (2025-09-20)

- Reliability primitives wired into pipeline edges:
  - Embedded `withRetry` and `CircuitBreaker` around embedder and store calls in `RAGPipeline`.
  - Degraded mode on retrieval: returns empty, safe bundles when breakers are open or failures persist.
  - Added integration tests: retry reduces failures; breaker opens and surfaces degraded path.
- Coverage gates and failure-mode tests:
  - Per-package coverage thresholds (>= 90%) enforced via `vitest` config in `@cortex-os/rag`.
  - Added/validated integration tests for timeouts, degraded mode, and reliability behavior.
- Removed external Archon references from runtime paths; MCP client surface retained as a local, optional shim for remote KB use.
- Ollama updated to v0.12.0 where containerized (Docker compose pinned); docs now recommend Homebrew as the primary install on macOS with Docker as fallback.
- Pg dependency remains optional (`optionalDependencies.pg`), pgvector store uses `@cortex-os/observability` for operation/latency metrics.

## Priority 1: Production Blockers 🚨

### 1) Security Hardening

**Status:** [ ] Not started  
**Impact:** Critical - Prevents production deployment  
**Estimated Effort:** 3-5 days

- [ ] Write failing tests for:
  - Command injection rejection (any subprocess/model runner)
  - Prototype pollution in metadata ingestion
  - Embedding dimension validation and content size limits
  - Strict schema validation for MCP/tool inputs and configs
  - XSS/injection in stored content
  - Rate limiting per workspace/user
- [ ] Implement central validators:
  - `sanitizeInput` with allowlist patterns
  - `validateEmbeddingDim` with configurable bounds
  - `validateContentSize` with memory limits
  - Deep metadata sanitizer with prototype pollution protection
  - Content security policy for stored documents
- [ ] Add security scan gate with OWASP dependency check
- [ ] Document security best practices and threat model

**Done when:** All security tests pass, `pnpm security:scan:all` is clean, and security docs published

### 2) System Health Checks & Degraded Mode

**Status:** [~] Partially complete (degraded mode exists, health checks missing)  
**Impact:** Critical - Required for production monitoring  
**Estimated Effort:** 2-3 days

- [ ] Tests for component health:
  - Embedder health (model loaded, responsive)
  - Store health (connection, query latency)
  - Reranker health (if enabled)
  - Cache health and hit rates
- [ ] Implement `/health` endpoint with:
  - Component-level status
  - Aggregated health summary
  - Dependency checks (pgvector, models)
  - Resource utilization (memory, CPU)
- [x] Graceful degradation code paths (retrieval returns safe empty bundles)
- [ ] Health check integration with K8s probes
- [ ] Alert thresholds and runbooks

**Done when:** Health endpoint returns accurate status, integrates with monitoring, and alerts configured

### 3) Complete Reliability Wiring

**Status:** [~] In progress (reranker not protected)  
**Impact:** Critical - Unprotected failure points  
**Estimated Effort:** 1-2 days

- [x] Embedder: retry + circuit breaker
- [x] Store: retry + circuit breaker  
- [ ] Reranker: retry + circuit breaker with fallback to base ranking
- [ ] Tests for reranker degraded behavior
- [ ] Timeout configuration per component
- [ ] Backpressure handling

**Done when:** All pipeline components have reliability primitives and degraded mode tests pass

## Priority 2: Scale & Performance Blockers ⚡

### 4) Vector Indexing / Quantization

**Status:** [ ] Not started  
**Impact:** High - Won't scale beyond ~10k vectors  
**Estimated Effort:** 5-7 days

- [ ] Benchmarks:
  - >10x speedup vs linear scan on 10k vectors
  - <5% accuracy degradation
  - Memory usage comparison
- [ ] Implement HNSW backend:
  - Configurable M, ef_construction parameters
  - Dynamic index updates
  - Persistence and recovery
- [ ] Optional quantization:
  - Product quantization for large datasets
  - Scalar quantization for memory efficiency
- [ ] Migration path from flat index

**Done when:** Benchmarks show >10x improvement, accuracy within bounds, and migration tested

### 5) Post-chunking (Query-time Adaptation)

**Status:** [ ] Not started  
**Impact:** High - Poor retrieval quality for varied queries  
**Estimated Effort:** 3-4 days

- [ ] Tests:
  - Summary queries get larger chunks
  - Detail queries get fine-grained chunks
  - Large doc retrieval < 1s
  - Context window optimization
- [ ] Implement `src/chunkers/post-chunker.ts`:
  - Query intent classification
  - Dynamic chunk sizing
  - Overlap adjustment
  - Metadata-aware chunking
- [ ] Integration with retrieval pipeline
- [ ] Performance regression tests

**Done when:** Adaptive chunking tests pass and latency targets met

### 6) End-to-End Observability

**Status:** [~] Partial (store metrics only)  
**Impact:** High - Can't debug or optimize in production  
**Estimated Effort:** 3-4 days

- [ ] Tests: metrics emitted for all operations
- [x] Store operations: latency and operation counts
- [ ] Pipeline metrics:
  - Ingest throughput and latency
  - Chunk distribution and sizes
  - Embedding batch sizes and timing
  - Rerank scores and latency
  - Cache hit rates
- [ ] Trace correlation across components
- [ ] Dashboard specifications:
  - P50/P95/P99 latencies
  - Error rates by component
  - Resource utilization
- [ ] SLO definitions and alerts

**Done when:** All metrics visible in monitoring, dashboards deployed, SLOs documented

## Priority 3: Production Optimizations 🔄

### 7) Embedding Process Pool

**Status:** [ ] Not started  
**Impact:** Medium - Limits throughput  
**Estimated Effort:** 3-4 days

- [ ] Tests:
  - Worker reuse across batches
  - Scales up/down based on queue depth
  - Handles worker failures gracefully
- [ ] Implement pool manager:
  - Configurable min/max workers
  - Queue management with backpressure
  - Health checks per worker
  - Metrics (queue depth, worker utilization)
- [ ] Pipeline integration with async batching

**Done when:** Pool scales under load and throughput improves by >2x

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

**Status:** [~] Partial  
**Impact:** Ongoing

- [x] CI coverage threshold (>= 90%)
- [x] Integration tests for failure modes
- [ ] Performance regression tests
- [ ] Determinism tests at scale

### 15) Ops/CI Gates & Deployments

**Status:** [ ] Not started  
**Impact:** Required for production

- [ ] CI gates:
  - Security scanning
  - Performance regression
  - Breaking change detection
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

- [ ] Emit metrics for `PgVectorStore.init()`
- [ ] Fix markdown lint issues
- [ ] API documentation generation
- [ ] Example notebooks

---

## Execution Guidance

### Sprint Planning Recommendations

**Sprint 1 (Week 1-2): Production Blockers**

- Security hardening (highest risk)
- Health checks
- Complete reliability wiring

**Sprint 2 (Week 3-4): Scale Enablers**

- Vector indexing (if >10k docs expected)
- Post-chunking
- Complete observability

**Sprint 3 (Week 5-6): Optimizations**

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
