# Implementation Checklist: Memory Ecosystem Performance Optimization

**Task ID**: `memory-ecosystem-performance-optimization`  
**Created**: 2025-10-15  
**Owner**: TBD  
**Status**: Planning Complete → Ready for Execution

---

## Pre-Implementation Setup

- [ ] Create feature branch: `git checkout -b feat/memory-performance-optimization`
- [ ] Read full implementation plan: `~/tasks/memory-ecosystem-performance-optimization/implementation-plan.md`
- [ ] Review TDD plan: `~/tasks/memory-ecosystem-performance-optimization/tdd-plan.md`
- [ ] Set up test watch mode: `pnpm --filter memory-core test -- --watch`
- [ ] Configure TDD Coach: `pnpm tdd-coach:watch`

---

## Task 1: Dependency Installation & Configuration

**Owner**: TBD  
**Estimated Time**: 30 minutes  
**Prerequisites**: None

### Checklist

- [ ] Add `undici@^6.0.0` to `packages/memories/package.json`
- [ ] Add `p-limit@^5.0.0` to `packages/memory-core/package.json`
- [ ] Add `lru-cache@^10.0.0` to `packages/memory-core/package.json`
- [ ] Install dependencies: `pnpm --filter memories i && pnpm --filter memory-core i`
- [ ] Add feature flags to `packages/memories/.env.example`:
  - `MEMORY_HTTP_POOL_ENABLED=false`
  - `MEMORY_HTTP_POOL_CONNECTIONS=10`
  - `MEMORY_HTTP_POOL_KEEP_ALIVE_TIMEOUT=4000`
- [ ] Add feature flags to `packages/memory-core/.env.example`:
  - `MEMORY_PARALLEL_INGEST_CONCURRENCY=0`
  - `MEMORY_CACHE_MAX_SIZE=100`
- [ ] Typecheck clean: `pnpm typecheck:smart`
- [ ] Commit: `chore(memories,memory-core): add undici and p-limit dependencies`

### Verification

```bash
pnpm --filter memories list --depth=0 | grep undici
pnpm --filter memory-core list --depth=0 | grep p-limit
pnpm typecheck:smart
```

**Expected**: Dependencies listed, no type errors

---

## Task 2: HTTP Pooling — Modernize FetchHttpClient

**Owner**: TBD  
**Estimated Time**: 4 hours  
**Prerequisites**: Task 1 complete

### Checklist

#### Red Phase (Write Failing Tests)

- [ ] Create `packages/memories/__tests__/http-pooling.test.ts`
- [ ] Write test: "should reuse connections across multiple requests"
- [ ] Write test: "should respect connection pool limits"
- [ ] Write test: "should handle pool closure gracefully"
- [ ] Write test: "should return pool stats"
- [ ] Write test: "should fallback to fetch when pooling disabled"
- [ ] Run tests: `pnpm --filter memories test http-pooling`
- [ ] **Expected**: All tests fail (not implemented)

#### Green Phase (Minimal Implementation)

- [ ] Import `Pool` from `undici` in `http-client.ts`
- [ ] Define `PoolConfig` interface
- [ ] Create `createPooledHttpClient(baseUrl, config)` factory
- [ ] Update `FetchHttpClient` constructor to accept optional `Pool`
- [ ] Wrap `fetch` calls with pool dispatcher when enabled
- [ ] Add `getPoolStats()` method
- [ ] Add `close()` method with pool cleanup
- [ ] Preserve existing `safeFetch` validation
- [ ] Gate pooling via `MEMORY_HTTP_POOL_ENABLED` env flag
- [ ] Run tests: `pnpm --filter memories test http-pooling`
- [ ] **Expected**: All tests pass

#### Refactor Phase

- [ ] Extract pool configuration to constants (≤40 line functions)
- [ ] Add JSDoc comments for public API
- [ ] Ensure branded logs: `{ brand: "brAInwav", component: "memories" }`
- [ ] Run tests: `pnpm --filter memories test http-pooling`
- [ ] **Expected**: Tests still pass

#### Quality Gates

- [ ] Coverage ≥95% for changed lines: `pnpm --filter memories test -- --coverage`
- [ ] Lint clean: `pnpm --filter memories lint`
- [ ] Typecheck clean: `pnpm --filter memories typecheck`
- [ ] No console warnings: `node --trace-warnings`

#### Commit

- [ ] Stage changes: `git add packages/memories/src/adapters/rest-api/http-client.ts packages/memories/__tests__/http-pooling.test.ts`
- [ ] Commit: `feat(memories): add undici HTTP pooling for REST adapter`
- [ ] Verify commit signed: `git log --show-signature -1`

---

## Task 3: Adaptive Rate-Limit Backoff

**Owner**: TBD  
**Estimated Time**: 3 hours  
**Prerequisites**: Task 2 complete

### Checklist

#### Red Phase

- [ ] Create `packages/memories/__tests__/rate-limit-backoff.test.ts`
- [ ] Write test: "should consume tokens from bucket"
- [ ] Write test: "should apply exponential backoff with cap"
- [ ] Write test: "should parse rate-limit reset headers"
- [ ] Write test: "should integrate with circuit breaker"
- [ ] Run tests: `pnpm --filter memories test rate-limit`
- [ ] **Expected**: All tests fail

#### Green Phase

- [ ] Add `TokenBucket` class in `rest-adapter.ts` (≤40 lines)
- [ ] Update `retryWithBackoff` to use token bucket
- [ ] Implement adaptive backoff: `min(baseDelay * 2^attempt, maxDelay)`
- [ ] Parse `X-RateLimit-Reset` header, schedule bucket refill
- [ ] Integrate circuit breaker from `packages/agents/src/lib/circuit-breaker.ts`
- [ ] Run tests: `pnpm --filter memories test rate-limit`
- [ ] **Expected**: All tests pass

#### Refactor Phase

- [ ] Extract retry constants to config
- [ ] Add observability metrics (backoff attempts, circuit breaker state)
- [ ] Document backoff strategy in JSDoc

#### Quality Gates

- [ ] Coverage ≥95%: `pnpm --filter memories test -- --coverage`
- [ ] Mutation score ≥75% for `TokenBucket`: `pnpm --filter memories test:mutate`
- [ ] Manual test: Trigger rate limit, observe backoff logs

#### Commit

- [ ] Commit: `refactor(memories): adaptive rate-limit backoff with token bucket`

---

## Task 4: Parallel Chunk Embedding

**Owner**: TBD  
**Estimated Time**: 5 hours  
**Prerequisites**: Task 1 complete

### Checklist

#### Red Phase

- [ ] Create `packages/memory-core/src/lib/concurrency.ts`
- [ ] Write failing test: "should limit concurrent operations"
- [ ] Create `packages/memory-core/src/lib/batch-processor.ts`
- [ ] Write failing test: "should process items in batches"
- [ ] Create `packages/memory-core/__tests__/parallel-ingest.test.ts`
- [ ] Write test: "should batch embed chunks with bounded concurrency"
- [ ] Write test: "should rollback on partial embedding failure"
- [ ] Write test: "should emit progress events per batch"
- [ ] Run tests: `pnpm --filter memory-core test parallel-ingest`
- [ ] **Expected**: All tests fail

#### Green Phase

- [ ] Implement `createBoundedQueue(limit)` using `p-limit`
- [ ] Implement `BatchProcessor` with progress hooks
- [ ] Update `GraphRAGIngestService.ingestDocument`:
  - Replace `for...of` with `queue.map(chunks, embedChunk)`
  - Set concurrency via `MEMORY_PARALLEL_INGEST_CONCURRENCY`
  - Emit A2A progress events per batch
- [ ] Add error aggregation and rollback logic
- [ ] Preserve transactional Qdrant writes
- [ ] Run tests: `pnpm --filter memory-core test parallel-ingest`
- [ ] **Expected**: All tests pass

#### Refactor Phase

- [ ] Extract embedding logic to helper functions (≤40 lines each)
- [ ] Add retry logic for transient embedding failures
- [ ] Optimize batch size based on chunk count

#### Quality Gates

- [ ] Coverage ≥95%: `pnpm --filter memory-core test -- --coverage`
- [ ] Mutation score ≥75% for `concurrency.ts`: `pnpm --filter memory-core test:mutate -- --mutate=src/lib/concurrency.ts`
- [ ] Manual test: Ingest 1000-chunk document, verify parallel logs

#### Commit

- [ ] Commit: `feat(memory-core): parallel chunk embedding with p-limit`

---

## Task 5: LRU Cache Eviction

**Owner**: TBD  
**Estimated Time**: 3 hours  
**Prerequisites**: Task 1 complete

### Checklist

#### Red Phase

- [ ] Create `packages/memory-core/__tests__/cache-eviction.test.ts`
- [ ] Write test: "should evict oldest entry when max size exceeded"
- [ ] Write test: "should update LRU order on cache hit"
- [ ] Write test: "should return accurate cache stats"
- [ ] Run tests: `pnpm --filter memory-core test cache-eviction`
- [ ] **Expected**: All tests fail

#### Green Phase

- [ ] Import `LRUCache` from `lru-cache` in `QdrantHybrid.ts`
- [ ] Replace `Map` with `LRUCache` in constructor
- [ ] Configure max size via `MEMORY_CACHE_MAX_SIZE` env
- [ ] Implement eviction callback with branded logs
- [ ] Add `getCacheStats()` method
- [ ] Run tests: `pnpm --filter memory-core test cache-eviction`
- [ ] **Expected**: All tests pass

#### Refactor Phase

- [ ] Add cache warming strategy (preload frequent queries)
- [ ] Document cache behavior in JSDoc
- [ ] Add metrics for eviction rate

#### Quality Gates

- [ ] Coverage ≥95%: `pnpm --filter memory-core test -- --coverage`
- [ ] Manual test: Fill cache to max+1, verify eviction logs

#### Commit

- [ ] Commit: `refactor(memory-core): LRU cache eviction for QdrantHybrid`

---

## Task 6: Distributed Cache Timer Lifecycle

**Owner**: TBD  
**Estimated Time**: 2 hours  
**Prerequisites**: Task 5 complete

### Checklist

#### Red Phase

- [ ] Update `cache-eviction.test.ts` with timer lifecycle tests
- [ ] Write test: "should cleanup timers on close"
- [ ] Write test: "should register shutdown hook"
- [ ] Write test: "should prevent duplicate shutdown registration"
- [ ] Run tests: `pnpm --filter memory-core test cache-eviction`
- [ ] **Expected**: New tests fail

#### Green Phase

- [ ] Store `setInterval` handle in `metricsInterval` field
- [ ] Add `close()` method: clear interval, flush writes, close Redis
- [ ] Register `process.on('beforeExit')` shutdown hook
- [ ] Add `autoCleanup` flag to constructor
- [ ] Add branded logs for lifecycle events
- [ ] Run tests: `pnpm --filter memory-core test cache-eviction`
- [ ] **Expected**: All tests pass

#### Refactor Phase

- [ ] Extract shutdown logic to helper function
- [ ] Document timer lifecycle in JSDoc

#### Quality Gates

- [ ] Coverage ≥95%: `pnpm --filter memory-core test -- --coverage`
- [ ] Manual test: Start/stop cache, verify no timer warnings
- [ ] Run with `node --trace-warnings`

#### Commit

- [ ] Commit: `fix(memory-core): prevent timer leaks in DistributedCache`

---

## Task 7: Integration Testing & Performance Validation

**Owner**: TBD  
**Estimated Time**: 4 hours  
**Prerequisites**: Tasks 2-6 complete

### Checklist

#### Baseline Metrics

- [ ] Create `~/tasks/.../validation/k6-load-test.js`
- [ ] Start memory-rest-api: `pnpm --filter memory-rest-api dev`
- [ ] Run baseline k6 test: `k6 run k6-load-test.js --out json=baseline-metrics.json`
- [ ] Record p50/p95/p99 latency in `baseline-metrics.json`
- [ ] Stop services

#### Post-Optimization Metrics

- [ ] Enable feature flags:
  - `export MEMORY_HTTP_POOL_ENABLED=true`
  - `export MEMORY_PARALLEL_INGEST_CONCURRENCY=4`
  - `export MEMORY_CACHE_MAX_SIZE=100`
- [ ] Start memory-rest-api: `pnpm --filter memory-rest-api dev`
- [ ] Run k6 test: `k6 run k6-load-test.js --out json=post-optimization-metrics.json`
- [ ] Record p50/p95/p99 latency
- [ ] Stop services

#### Comparison

- [ ] Create comparison script: `scripts/compare-k6-metrics.ts`
- [ ] Run comparison: `pnpm tsx scripts/compare-k6-metrics.ts`
- [ ] Verify ≥30% p95 latency reduction
- [ ] Verify ≥50% throughput increase
- [ ] Document results in `SUMMARY.md`

#### Integration Tests

- [ ] Create end-to-end test: REST → GraphRAG → Qdrant
- [ ] Test full ingest flow with pooling enabled
- [ ] Test parallel embedding with real mock server
- [ ] Run: `pnpm test:e2e -- packages/memories packages/memory-core`
- [ ] **Expected**: All integration tests pass

#### Commit

- [ ] Commit: `test(memory): add k6 performance validation suite`

---

## Task 8: Documentation & Migration Guide

**Owner**: TBD  
**Estimated Time**: 3 hours  
**Prerequisites**: Tasks 1-7 complete

### Checklist

#### Package READMEs

- [ ] Update `packages/memories/README.md`:
  - Document `MEMORY_HTTP_POOL_ENABLED` flag
  - Document pool configuration options
  - Add usage examples for `createPooledHttpClient`
- [ ] Update `packages/memory-core/README.md`:
  - Document `MEMORY_PARALLEL_INGEST_CONCURRENCY` flag
  - Document `MEMORY_CACHE_MAX_SIZE` flag
  - Add performance tuning guidelines

#### ADR

- [ ] Create `docs/adr/0015-memory-performance-optimization.md`
- [ ] Document context, decision, and consequences
- [ ] Include performance metrics comparison
- [ ] Link to implementation plan and TDD plan
- [ ] Add rollout strategy

#### Migration Guide

- [ ] Create `~/tasks/.../MIGRATION.md`:
  - Staged rollout instructions
  - Feature flag configurations
  - Rollback procedures
  - Troubleshooting guide
- [ ] Document breaking changes (if any)

#### Summary

- [ ] Update `~/tasks/.../SUMMARY.md`:
  - Final performance metrics
  - Lessons learned
  - Future optimization opportunities
  - Links to all artifacts

#### Quality Gates

- [ ] Lint Markdown: `pnpm lint:markdown packages/*/README.md docs/adr/*.md`
- [ ] Verify links: `pnpm check:links`
- [ ] Spell check: `pnpm spellcheck docs/`

#### Commit

- [ ] Commit: `docs(memory): performance optimization ADR and migration guide`

---

## Pre-Merge Checklist

**All tasks complete before proceeding**

### Code Quality

- [ ] All tests passing: `pnpm test:smart -- --coverage`
- [ ] Coverage ≥92% global, ≥95% changed lines
- [ ] Mutation score ≥75%: `pnpm --filter memory-core test:mutate`
- [ ] Lint clean: `pnpm lint:smart`
- [ ] Typecheck clean: `pnpm typecheck:smart`
- [ ] Build clean: `pnpm build:smart`

### Security & Structure

- [ ] Security scan clean: `pnpm security:scan --scope=memories --scope=memory-core`
- [ ] Structure validation: `pnpm structure:validate`
- [ ] No secrets leaked: `pnpm gitleaks:check`
- [ ] SBOM generated: `pnpm sbom:generate`

### Observability

- [ ] Branded logs verified: `{ brand: "brAInwav", component: "..." }`
- [ ] OpenTelemetry traces enabled
- [ ] Performance budgets met (p95 <250ms)

### Documentation

- [ ] All READMEs updated
- [ ] ADR merged and indexed
- [ ] `SUMMARY.md` complete with metrics
- [ ] Migration guide reviewed

### Code Review Checklist

- [ ] Complete `/.cortex/rules/code-review-checklist.md`
- [ ] All BLOCKER items ☑ PASS
- [ ] Attach evidence in PR (file paths, line ranges, run IDs)

### Memory Persistence

- [ ] Decision logged in `.github/instructions/memories.instructions.md`
- [ ] Persist via Local Memory MCP/REST

### PR Preparation

- [ ] Create PR: `gh pr create --title "feat: memory ecosystem performance optimization" --body-file PR_BODY.md`
- [ ] Attach artifacts:
  - `~/tasks/.../test-logs/unit-tests.xml`
  - `~/tasks/.../verification/coverage-report.html`
  - `~/tasks/.../validation/post-optimization-metrics.json`
- [ ] Link implementation plan in PR description
- [ ] Request reviews from @brAInwav-devs

---

## Post-Merge Tasks

### Deployment

- [ ] Deploy to dev environment
- [ ] Enable pooling: `MEMORY_HTTP_POOL_ENABLED=true`
- [ ] Monitor for 24h, verify no errors
- [ ] Enable parallel ingest (concurrency=2)
- [ ] Monitor for 48h, check latency metrics
- [ ] Gradually increase concurrency to 4
- [ ] Promote to staging after 1 week

### Monitoring

- [ ] Set up Grafana dashboard for:
  - Pool connection stats
  - Parallel ingest concurrency
  - Cache hit/miss/eviction rates
  - p95 latency trends
- [ ] Configure alerts:
  - Pool saturation >90%
  - p95 latency >250ms
  - Cache eviction rate spike

### Cleanup

- [ ] Archive task directory after 30 days
- [ ] Remove feature flags after stable in production
- [ ] Update capacity planning docs

---

## Task Summary

| Task | Owner | Status | Est. Time | Actual Time |
|------|-------|--------|-----------|-------------|
| 1. Dependencies | TBD | ⬜ Pending | 30 min | - |
| 2. HTTP Pooling | TBD | ⬜ Pending | 4 hours | - |
| 3. Rate Limit Backoff | TBD | ⬜ Pending | 3 hours | - |
| 4. Parallel Embedding | TBD | ⬜ Pending | 5 hours | - |
| 5. LRU Cache | TBD | ⬜ Pending | 3 hours | - |
| 6. Timer Lifecycle | TBD | ⬜ Pending | 2 hours | - |
| 7. Performance Validation | TBD | ⬜ Pending | 4 hours | - |
| 8. Documentation | TBD | ⬜ Pending | 3 hours | - |
| **Total** | | | **24 hours** | **-** |

---

## Notes & Blockers

_Add any notes, blockers, or clarifications here_

---

**Checklist Status**: ✅ Ready for Assignment  
**Next Step**: Assign owners and begin Task 1
