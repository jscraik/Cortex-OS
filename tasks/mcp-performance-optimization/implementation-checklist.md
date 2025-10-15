# Implementation Checklist: MCP Performance Optimization

**Task ID**: `mcp-performance-optimization`  
**Created**: 2025-10-15  
**Owner**: TBD

---

## Task 1: Add Dependencies & Feature Flags

- [ ] Add `undici` (^6.19.0) to `packages/mcp/package.json`
- [ ] Add `p-limit` (^5.0.0) to `packages/mcp/package.json`
- [ ] Run `pnpm install` in workspace root
- [ ] Add `ConnectorFeatureFlags` type to `manager.ts`
- [ ] Implement `parseFeatureFlags()` function reading env vars
- [ ] Add env flag parsing to `ConnectorProxyManager` constructor
- [ ] Run `pnpm --filter @cortex-os/mcp typecheck`
- [ ] Verify `node_modules/undici` and `node_modules/p-limit` exist
- [ ] Commit: `chore(mcp): add undici and p-limit for performance optimization`

---

## Task 2: Implement Refresh Scheduler & Cache Layer

- [ ] Create `packages/mcp/src/connectors/refresh-scheduler.ts`
- [ ] Define `RefreshSchedulerOptions` interface
- [ ] Implement `RefreshScheduler` class with `start()`, `stop()`, `forceRefresh()`
- [ ] Add jitter calculation (±20% of intervalMs)
- [ ] Implement error handling (catch, log, continue)
- [ ] Create `packages/mcp/src/connectors/cache.ts`
- [ ] Define `CachedValue<T>` interface
- [ ] Implement `ManifestCache<T>` class with `get()`, `set()`, `invalidate()`
- [ ] Add stale-on-error logic (return previous value if expired)
- [ ] Create `~/tasks/mcp-performance-optimization/design/architecture-diagram.md`
- [ ] Draw ASCII flow: refresh → cache → manager
- [ ] Run `pnpm --filter @cortex-os/mcp typecheck`
- [ ] Commit: `feat(mcp): add refresh scheduler and TTL-aware manifest cache`

---

## Task 3: Enhance Service Map Loader with Shared Agent

- [ ] Import `Agent` and `fetch as undiciFetch` from `undici` in `service-map.ts`
- [ ] Add `agent?: Agent` to `ConnectorServiceMapOptions` interface
- [ ] Update `buildHeaders()` to include `Cache-Control: no-cache`
- [ ] Modify `executeRequest()` to use `undiciFetch` with `dispatcher: agent` when agent provided
- [ ] Add fallback to `options.fetchImpl ?? fetch` when no agent
- [ ] Run `pnpm --filter @cortex-os/mcp typecheck`
- [ ] Commit: `refactor(mcp): use shared undici agent in service map loader`

---

## Task 4: Parallelize Connector Sync in Manager

- [ ] Import `Agent` from `undici` in `manager.ts`
- [ ] Import `pLimit` from `p-limit`
- [ ] Import `RefreshScheduler` and `ManifestCache` from local modules
- [ ] Add private fields: `agent`, `scheduler`, `manifestCache`, `flags`
- [ ] Initialize `agent = new Agent({ connections: 10, pipelining: 1 })` in constructor
- [ ] Initialize `manifestCache = new ManifestCache<ServiceMapPayload>()`
- [ ] Call `parseFeatureFlags()` and store in `this.flags`
- [ ] Create and start `RefreshScheduler` if `flags.asyncRefresh === true`
- [ ] Add `syncInternal()` private method with parallel logic
- [ ] Update `sync(force)` to check cache first
- [ ] Replace `for` loop with `Promise.allSettled` + `pLimit(4)`
- [ ] Pass `agent` to `loadConnectorServiceMap` in `syncInternal()`
- [ ] Add `disconnect()` method to stop scheduler and close agent
- [ ] Log failures from `allSettled` results without throwing
- [ ] Run `pnpm --filter @cortex-os/mcp typecheck`
- [ ] Commit: `feat(mcp): parallelize connector sync with concurrency limiter`

---

## Task 5: Unit Tests for MCP Connector Enhancements

- [ ] Create `packages/mcp/src/connectors/__tests__/` directory
- [ ] Write `refresh-scheduler.test.ts`:
  - [ ] Test: schedules refresh with jitter
  - [ ] Test: handles refresh errors gracefully
  - [ ] Test: calling start() twice is safe
  - [ ] Test: stop() cancels pending refresh
- [ ] Write `cache.test.ts`:
  - [ ] Test: returns fresh value before TTL expiry
  - [ ] Test: returns stale value after expiry
  - [ ] Test: invalidate() clears cache
  - [ ] Test: handles TTL=0 (immediate expiry)
- [ ] Write `manager.test.ts`:
  - [ ] Test: syncs all enabled connectors in parallel
  - [ ] Test: isolates connector failures
  - [ ] Test: uses cached manifest when not expired
  - [ ] Test: force=true bypasses cache
  - [ ] Test: disconnect() stops scheduler
- [ ] Write `service-map.test.ts`:
  - [ ] Test: uses shared agent for HTTP requests
  - [ ] Test: throws on HTTP timeout
  - [ ] Test: throws on signature mismatch
- [ ] Run `pnpm --filter @cortex-os/mcp test -- refresh-scheduler`
- [ ] Run `pnpm --filter @cortex-os/mcp test -- cache`
- [ ] Run `pnpm --filter @cortex-os/mcp test -- manager`
- [ ] Run `pnpm --filter @cortex-os/mcp test -- service-map`
- [ ] Run `pnpm --filter @cortex-os/mcp test:coverage`
- [ ] Verify coverage ≥80%
- [ ] Copy coverage report to `~/tasks/mcp-performance-optimization/verification/coverage-mcp/`
- [ ] Commit: `test(mcp): add unit tests for async connector refresh`

---

## Task 6: Implement Registry Memory Cache with Batched Flush

- [ ] Create `packages/mcp-registry/src/memory-cache.ts`
- [ ] Define `RegistryCacheOptions` interface
- [ ] Implement `RegistryMemoryCache` class
- [ ] Add `Map<string, ServerInfo>` for in-memory storage
- [ ] Implement `init()` to load from `registryPath`
- [ ] Implement `getAll()` to return array of servers
- [ ] Implement `upsert(si)` to update map and mark dirty
- [ ] Implement `remove(name)` to delete from map and mark dirty
- [ ] Implement `flush()` with atomic write (tmp → rename)
- [ ] Add periodic flush via `setInterval(flush, flushIntervalMs)`
- [ ] Implement `close()` to clear interval and flush dirty state
- [ ] Run `pnpm --filter @cortex-os/mcp-registry typecheck`
- [ ] Commit: `feat(mcp-registry): add memory cache with batched flush`

---

## Task 7: Integrate Memory Cache into fs-store

- [ ] Import `RegistryMemoryCache` in `fs-store.ts`
- [ ] Add module-level `cacheInstance` variable
- [ ] Implement `ensureCache()` to lazily initialize cache
- [ ] Update `readAll()` to call `cache.getAll()` and parse
- [ ] Update `upsert(si)` to call `cache.upsert(si)`
- [ ] Update `remove(name)` to call `cache.remove(name)`
- [ ] Export `getRegistryCache()` function
- [ ] Export `closeRegistryCache()` function
- [ ] Run `pnpm --filter @cortex-os/mcp-registry typecheck`
- [ ] Commit: `refactor(mcp-registry): integrate memory cache into fs-store`

---

## Task 8: Unit Tests for Registry Memory Cache

- [ ] Create `packages/mcp-registry/src/__tests__/` directory
- [ ] Write `memory-cache.test.ts`:
  - [ ] Test: initializes empty cache when file missing
  - [ ] Test: loads existing registry on init()
  - [ ] Test: upsert adds new server
  - [ ] Test: remove deletes server
  - [ ] Test: flushes dirty state on close()
  - [ ] Test: periodic flush triggers every N ms
  - [ ] Test: flush() handles write errors gracefully
- [ ] Write `fs-store.test.ts`:
  - [ ] Test: readAll() delegates to cache
  - [ ] Test: upsert() delegates to cache
  - [ ] Test: remove() delegates to cache
  - [ ] Test: closeRegistryCache() flushes and clears singleton
- [ ] Run `pnpm --filter @cortex-os/mcp-registry test -- memory-cache`
- [ ] Run `pnpm --filter @cortex-os/mcp-registry test -- fs-store`
- [ ] Run `pnpm --filter @cortex-os/mcp-registry test:coverage`
- [ ] Verify coverage ≥80%
- [ ] Copy coverage report to `~/tasks/mcp-performance-optimization/verification/coverage-registry/`
- [ ] Commit: `test(mcp-registry): add memory cache unit tests`

---

## Task 9: Benchmark & Document Performance Gains

- [ ] Create performance test script `packages/mcp/src/connectors/__tests__/benchmark.perf.test.ts`
- [ ] Mock 10 connectors with 500ms manifest fetch
- [ ] Implement baseline measurement (sequential sync)
- [ ] Implement optimized measurement (parallel sync)
- [ ] Run baseline and record results
- [ ] Run optimized and record results
- [ ] Calculate improvement percentage
- [ ] Verify ≥35% improvement
- [ ] Export results to `~/tasks/mcp-performance-optimization/test-logs/benchmark-results.json`
- [ ] Export latency comparison to `~/tasks/mcp-performance-optimization/verification/latency-comparison.csv`
- [ ] Create `~/tasks/mcp-performance-optimization/refactoring/performance-analysis.md`
- [ ] Document bottleneck findings in performance-analysis.md
- [ ] Update `~/tasks/mcp-performance-optimization/SUMMARY.md` with metrics
- [ ] Run `pnpm --filter @cortex-os/mcp test -- benchmark`
- [ ] Commit: `perf(mcp): validate 35% cold-start improvement with benchmarks`

---

## Task 10: Update Documentation & SUMMARY

- [ ] Create or update `packages/mcp/README.md`
- [ ] Document `MCP_CONNECTOR_REFRESH_SYNC` env flag
- [ ] Document `MCP_CONNECTOR_REFRESH_INTERVAL_MS` env flag
- [ ] Add migration path section (3-phase rollout)
- [ ] Add rollback instructions
- [ ] Update `~/tasks/mcp-performance-optimization/SUMMARY.md`:
  - [ ] Add final test coverage metrics
  - [ ] Add performance gains (cold-start %, p95 latency)
  - [ ] Add lessons learned
  - [ ] Add links to baton, implementation plan, TDD plan
- [ ] Verify all markdown files render correctly
- [ ] Commit: `docs(mcp): document async refresh env flags and migration path`

---

## Final Validation

- [ ] Run full test suite: `pnpm --filter @cortex-os/mcp test`
- [ ] Run full test suite: `pnpm --filter @cortex-os/mcp-registry test`
- [ ] Run lint: `pnpm --filter @cortex-os/mcp lint`
- [ ] Run lint: `pnpm --filter @cortex-os/mcp-registry lint`
- [ ] Run typecheck: `pnpm --filter @cortex-os/mcp typecheck`
- [ ] Run typecheck: `pnpm --filter @cortex-os/mcp-registry typecheck`
- [ ] Verify coverage ≥80% for both packages
- [ ] Verify no TypeScript errors
- [ ] Verify no lint errors
- [ ] Verify all commits follow Conventional Commits format
- [ ] Review all task artifacts in `~/tasks/mcp-performance-optimization/`
- [ ] Archive task folder to `docs/ADR/` for reference

---

## Completion Criteria

- [ ] All checkboxes above marked complete
- [ ] CI pipeline green
- [ ] Code review approved
- [ ] Performance benchmarks confirm ≥35% improvement
- [ ] p95 latency ≤250ms validated
- [ ] Documentation complete and accurate
- [ ] SUMMARY.md updated with final metrics
- [ ] Dead code removed (no TODOs or commented blocks)

---

**Status**: Ready for Implementation  
**Estimated Effort**: 7.5 days  
**Owner**: TBD
