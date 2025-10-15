# Implementation Checklist: MCP Performance Optimization

**Task ID**: `mcp-performance-optimization`  
**Created**: 2025-10-15  
**Owner**: TBD

---

## Task 1: Add Dependencies & Feature Flags

- [x] Add `undici` (^6.19.0) to `packages/mcp/package.json`
- [x] Add `p-limit` (^5.0.0) to `packages/mcp/package.json`
- [x] Run `pnpm install` in workspace root
- [x] Add `ConnectorFeatureFlags` type to `manager.ts`
- [x] Implement `parseFeatureFlags()` function reading env vars
- [x] Add env flag parsing to `ConnectorProxyManager` constructor
- [ ] Run `pnpm --filter @cortex-os/mcp typecheck`
- [ ] Verify `node_modules/undici` and `node_modules/p-limit` exist
- [ ] Commit: `chore(mcp): add undici and p-limit for performance optimization`

---

## Task 2: Implement Refresh Scheduler & Cache Layer

- [x] Create `packages/mcp/src/connectors/refresh-scheduler.ts`
- [x] Define `RefreshSchedulerOptions` interface
- [x] Implement `RefreshScheduler` class with `start()`, `stop()`, `forceRefresh()`
- [x] Add jitter calculation (±20% of intervalMs)
- [x] Implement error handling (catch, log, continue)
- [x] Create `packages/mcp/src/connectors/cache.ts`
- [x] Define `CachedValue<T>` interface
- [x] Implement `ManifestCache<T>` class with `get()`, `set()`, `invalidate()`
- [x] Add stale-on-error logic (return previous value if expired)
- [x] Create `~/tasks/mcp-performance-optimization/design/architecture-diagram.md`
- [x] Draw ASCII flow: refresh → cache → manager
- [ ] Run `pnpm --filter @cortex-os/mcp typecheck`
- [ ] Commit: `feat(mcp): add refresh scheduler and TTL-aware manifest cache`

---

## Task 3: Enhance Service Map Loader with Shared Agent

- [x] Import `Agent` and `fetch as undiciFetch` from `undici` in `service-map.ts`
- [x] Add `agent?: Agent` to `ConnectorServiceMapOptions` interface
- [x] Update `buildHeaders()` to include `Cache-Control: no-cache`
- [x] Modify `executeRequest()` to use `undiciFetch` with `dispatcher: agent` when agent provided
- [x] Add fallback to `options.fetchImpl ?? fetch` when no agent
- [ ] Run `pnpm --filter @cortex-os/mcp typecheck`
- [ ] Commit: `refactor(mcp): use shared undici agent in service map loader`

---

## Task 4: Parallelize Connector Sync in Manager

- [x] Import `Agent` from `undici` in `manager.ts`
- [x] Import `pLimit` from `p-limit`
- [x] Import `RefreshScheduler` and `ManifestCache` from local modules
- [x] Add private fields: `agent`, `scheduler`, `manifestCache`, `flags`
- [x] Initialize `agent = new Agent({ connections: 10, pipelining: 1 })` in constructor
- [x] Initialize `manifestCache = new ManifestCache<ServiceMapPayload>()`
- [x] Call `parseFeatureFlags()` and store in `this.flags`
- [x] Create and start `RefreshScheduler` if `flags.asyncRefresh === true`
- [x] Add `syncInternal()` private method with parallel logic
- [x] Update `sync(force)` to check cache first
- [x] Replace `for` loop with `Promise.allSettled` + `pLimit(4)`
- [x] Pass `agent` to `loadConnectorServiceMap` in `syncInternal()`
- [x] Add `disconnect()` method to stop scheduler and close agent
- [x] Log failures from `allSettled` results without throwing
- [ ] Run `pnpm --filter @cortex-os/mcp typecheck`
- [ ] Commit: `feat(mcp): parallelize connector sync with concurrency limiter`

---

## Task 5: Unit Tests for MCP Connector Enhancements

- [x] Create `packages/mcp/src/connectors/__tests__/` directory
- [ ] Write `refresh-scheduler.test.ts`:
- [x] Test: schedules refresh with jitter
- [x] Test: handles refresh errors gracefully
- [x] Test: calling start() twice is safe
- [x] Test: stop() cancels pending refresh
- [ ] Write `cache.test.ts`:
- [x] Test: returns fresh value before TTL expiry
- [x] Test: returns stale value after expiry
- [x] Test: invalidate() clears cache
- [x] Test: handles TTL=0 (immediate expiry)
- [ ] Write `manager.test.ts`:
- [x] Test: syncs all enabled connectors in parallel
- [x] Test: isolates connector failures
- [x] Test: uses cached manifest when not expired
- [x] Test: force=true bypasses cache
- [x] Test: disconnect() stops scheduler
- [ ] Write `service-map.test.ts`:
- [x] Test: uses shared agent for HTTP requests
- [x] Test: throws on HTTP timeout
- [x] Test: throws on signature mismatch
- [ ] Run `pnpm --filter @cortex-os/mcp test -- refresh-scheduler`
- [ ] Run `pnpm --filter @cortex-os/mcp test -- cache`
- [ ] Run `pnpm --filter @cortex-os/mcp test -- manager`
- [ ] Run `pnpm --filter @cortex-os/mcp test -- service-map`
- [ ] Run `pnpm --filter @cortex-os/mcp test:coverage`
- [ ] Verify coverage ≥90% global and ≥95% changed lines
- [ ] Copy coverage report to `~/tasks/mcp-performance-optimization/verification/coverage-mcp/`
- [ ] Commit: `test(mcp): add unit tests for async connector refresh`

---

## Task 6: Implement Registry Memory Cache with Batched Flush

- [x] Create `packages/mcp-registry/src/memory-cache.ts`
- [x] Define `RegistryCacheOptions` interface
- [x] Implement `RegistryMemoryCache` class
- [x] Add `Map<string, ServerInfo>` for in-memory storage
- [x] Implement `init()` to load from `registryPath`
- [x] Implement `getAll()` to return array of servers
- [x] Implement `upsert(si)` to update map and mark dirty
- [x] Implement `remove(name)` to delete from map and mark dirty
- [x] Implement `flush()` with atomic write (tmp → rename)
- [x] Add periodic flush via `setInterval(flush, flushIntervalMs)`
- [x] Implement `close()` to clear interval and flush dirty state
- [x] Run `pnpm --filter @cortex-os/mcp-registry typecheck`
- [ ] Commit: `feat(mcp-registry): add memory cache with batched flush`

---

## Task 7: Integrate Memory Cache into fs-store

- [x] Import `RegistryMemoryCache` in `fs-store.ts`
- [x] Add module-level `cacheInstance` variable
- [x] Implement `ensureCache()` to lazily initialize cache
- [x] Update `readAll()` to call `cache.getAll()` and parse
- [x] Update `upsert(si)` to call `cache.upsert(si)`
- [x] Update `remove(name)` to call `cache.remove(name)`
- [x] Export `getRegistryCache()` function
- [x] Export `closeRegistryCache()` function
- [x] Run `pnpm --filter @cortex-os/mcp-registry typecheck`
- [ ] Commit: `refactor(mcp-registry): integrate memory cache into fs-store`

---

## Task 8: Unit Tests for Registry Memory Cache

- [x] Create `packages/mcp-registry/src/__tests__/` directory
- [ ] Write `memory-cache.test.ts`:
- [x] Test: initializes empty cache when file missing
- [x] Test: loads existing registry on init()
- [x] Test: upsert adds new server
- [x] Test: remove deletes server
- [x] Test: flushes dirty state on close()
- [x] Test: periodic flush triggers every N ms
- [x] Test: flush() handles write errors gracefully
- [ ] Write `fs-store.test.ts`:
- [x] Test: readAll() delegates to cache
- [x] Test: upsert() delegates to cache
- [x] Test: remove() delegates to cache
- [x] Test: closeRegistryCache() flushes and clears singleton
- [ ] Run `pnpm --filter @cortex-os/mcp-registry test -- memory-cache`
- [ ] Run `pnpm --filter @cortex-os/mcp-registry test -- fs-store`
- [ ] Run `pnpm --filter @cortex-os/mcp-registry test:coverage`
- [ ] Verify coverage ≥90% global and ≥95% changed lines
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
- [x] Run typecheck: `pnpm --filter @cortex-os/mcp-registry typecheck`
- [ ] Verify coverage ≥90% global and ≥95% changed lines for both packages
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
