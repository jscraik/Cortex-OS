# TDD Plan: MCP Performance Optimization

**Task ID**: `mcp-performance-optimization`  
**Created**: 2025-10-15  
**Status**: Ready for Test Execution

---

## Overview

This TDD plan outlines the test-first approach for implementing MCP performance optimizations. All tests must be written BEFORE implementation code, following the Red-Green-Refactor cycle.

---

## Test Strategy

### Test Types

1. **Unit Tests**: Isolated component testing with mocked dependencies
2. **Integration Tests**: Multi-component interaction (cache + filesystem, manager + service-map)
3. **Performance Tests**: Benchmark before/after comparisons
4. **Property Tests**: Invariant verification (cache consistency, scheduler timing bounds)

### Test Execution Order

1. Write failing unit tests for new components (RefreshScheduler, ManifestCache, RegistryMemoryCache)
2. Implement minimal code to make tests pass
3. Write integration tests for component interactions
4. Add performance benchmarks
5. Refactor with test coverage validation

---

## Case Matrix

### 1. RefreshScheduler

#### Happy Path

- **Test**: `schedules refresh at regular intervals`
  - Setup: Create scheduler with 1000ms interval, mock `onRefresh`
  - Action: Start scheduler, advance fake timers by 1000ms
  - Assert: `onRefresh` called exactly once
  
- **Test**: `calls onRefresh on forceRefresh()`
  - Setup: Create scheduler, start it
  - Action: Call `forceRefresh()`
  - Assert: `onRefresh` called immediately, not affected by interval timer

#### Boundary Cases

- **Test**: `handles zero interval gracefully`
  - Setup: Scheduler with `intervalMs: 0`
  - Assert: Should throw or default to minimum safe interval (e.g., 100ms)
  
- **Test**: `handles missing jitterFactor`
  - Setup: Scheduler without `jitterFactor` option
  - Assert: Defaults to 0.2 (20% jitter)

#### Error Paths

- **Test**: `continues scheduling after onRefresh throws`
  - Setup: `onRefresh` rejects with error
  - Action: Start, advance timers through 3 cycles
  - Assert: `onRefresh` called 3 times; logger.warn called 3 times; no uncaught exceptions

- **Test**: `handles rapid stop/start cycles`
  - Setup: Create scheduler
  - Action: start() → stop() → start() → stop() (rapid)
  - Assert: No timer leaks; final state is stopped

#### Idempotency

- **Test**: `calling start() twice is safe`
  - Setup: Create scheduler
  - Action: start() → start()
  - Assert: Only one timer active; `onRefresh` not duplicated

- **Test**: `calling stop() twice is safe`
  - Setup: Create and start scheduler
  - Action: stop() → stop()
  - Assert: No errors; timer cleared once

#### Time-Skew / Jitter

- **Test**: `applies jitter within bounds`
  - Setup: Scheduler with `intervalMs: 1000`, `jitterFactor: 0.2`
  - Action: Mock `Math.random()` to return 0, 0.5, 1; start and measure next timer delay
  - Assert: Delays are [800ms, 1000ms, 1200ms] respectively (±20%)

#### Cancellation

- **Test**: `stop() cancels pending refresh`
  - Setup: Start scheduler, advance 500ms (halfway)
  - Action: stop()
  - Assert: `onRefresh` never called; timer cleared

---

### 2. ManifestCache

#### Happy Path

- **Test**: `returns fresh value before TTL expiry`
  - Setup: Cache with `set(manifest, 5000)` at t=0
  - Action: `get()` at t=2000
  - Assert: Returns `manifest`

- **Test**: `stores and retrieves manifest`
  - Setup: Empty cache
  - Action: `set({ connectors: [...] }, 10000)` → `get()`
  - Assert: `get()` returns exact object

#### Boundary Cases

- **Test**: `handles TTL=0 (immediate expiry)`
  - Setup: `set(manifest, 0)`
  - Action: `get()` immediately
  - Assert: Returns `undefined` (expired)

- **Test**: `returns undefined when empty`
  - Setup: New cache, never called `set()`
  - Action: `get()`
  - Assert: `undefined`

#### Error Paths

- **Test**: `handles parse errors in stale value`
  - Note: Cache stores typed values; parse errors occur at consumer level
  - Setup: Set valid manifest, let expire, consumer expects different schema
  - Assert: Consumer must validate; cache returns stale value as-is

#### Idempotency

- **Test**: `setting same value twice updates TTL`
  - Setup: `set(manifest, 5000)` at t=0
  - Action: `set(manifest, 5000)` at t=3000
  - Assert: `get()` at t=7000 returns manifest (new TTL from t=3000)

#### Stale-on-Error

- **Test**: `returns stale value after expiry`
  - Setup: `set(manifest1, 1000)` at t=0, advance to t=2000 (expired)
  - Action: `set(manifest2, 1000)` at t=2000, advance to t=3500 (expired)
  - Assert: `get()` at t=3500 returns `manifest1` (previous stale)

- **Test**: `overwrites stale value on new set`
  - Setup: `set(v1, 1000)`, expire, `set(v2, 1000)`, expire, `set(v3, 1000)`
  - Assert: `get()` returns `v3` (fresh); stale is `v2`

#### Invalidation

- **Test**: `invalidate() clears cache`
  - Setup: `set(manifest, 10000)`
  - Action: `invalidate()` → `get()`
  - Assert: `get()` returns `undefined`

---

### 3. ConnectorProxyManager (Parallel Sync)

#### Happy Path

- **Test**: `syncs all enabled connectors in parallel`
  - Setup: Mock service-map with 4 enabled connectors
  - Action: `sync()`
  - Assert: All 4 `ensureProxy` calls happen concurrently (via `Promise.allSettled` spy)

- **Test**: `uses cached manifest when not expired`
  - Setup: `sync()` once, manifest cached with TTL=10s
  - Action: `sync()` again after 2s
  - Assert: `loadConnectorServiceMap` called only once

#### Boundary Cases

- **Test**: `handles zero connectors`
  - Setup: Service-map returns `{ connectors: [] }`
  - Action: `sync()`
  - Assert: No errors; no proxy creation attempts

- **Test**: `respects concurrency limit of 4`
  - Setup: Mock 10 enabled connectors, each `ensureProxy` takes 100ms
  - Action: `sync()`
  - Assert: Max 4 concurrent proxy creations at any time (via `p-limit` spy)

#### Error Paths

- **Test**: `isolates connector failures`
  - Setup: 5 connectors, connector #3 throws during `ensureProxy`
  - Action: `sync()`
  - Assert: Connectors 1,2,4,5 succeed; connector 3 logged as warning; no throw

- **Test**: `continues sync after service-map failure on background refresh`
  - Setup: Initial `sync()` succeeds, background refresh fails
  - Action: Trigger background refresh (scheduler)
  - Assert: Stale manifest still served; error logged but not thrown

#### Idempotency

- **Test**: `force=true bypasses cache`
  - Setup: Cached manifest, TTL not expired
  - Action: `sync(force: true)`
  - Assert: `loadConnectorServiceMap` called again

- **Test**: `duplicate sync() calls are safe`
  - Setup: Start two `sync()` calls simultaneously
  - Assert: Both complete without race; connectors registered once per tool

#### Time-Skew

- **Test**: `respects manifest TTL from server`
  - Setup: Service-map returns `{ generatedAt: '2025-10-15T00:00:00Z', ttlSeconds: 300 }`
  - Action: `sync()`, advance time by 310s
  - Assert: Cache expired; next `sync()` fetches fresh manifest

#### Cancellation

- **Test**: `disconnect() stops scheduler and closes agent`
  - Setup: Start manager with async refresh
  - Action: `disconnect()`
  - Assert: Scheduler stopped, agent closed, no pending timers

---

### 4. Service Map Loader (Shared Agent)

#### Happy Path

- **Test**: `uses shared agent for HTTP requests`
  - Setup: Provide `agent` option to `loadConnectorServiceMap`
  - Action: Call loader twice
  - Assert: Same agent instance used (spy on `undici.fetch` with `dispatcher` option)

- **Test**: `parses valid manifest with signature`
  - Setup: Mock response with valid signature
  - Action: `loadConnectorServiceMap(options)`
  - Assert: Returns parsed `ServiceMapPayload` with correct `expiresAtMs`

#### Boundary Cases

- **Test**: `falls back to global fetch when no agent`
  - Setup: Omit `agent` option
  - Action: `loadConnectorServiceMap(options)`
  - Assert: Uses `options.fetchImpl ?? fetch`

#### Error Paths

- **Test**: `throws on HTTP timeout`
  - Setup: Mock fetch to hang, timeout=100ms
  - Action: `loadConnectorServiceMap(options)`
  - Assert: Throws `ConnectorManifestError` with timeout message; aborts request

- **Test**: `throws on signature mismatch`
  - Setup: Mock response with invalid signature
  - Action: `loadConnectorServiceMap(options)`
  - Assert: Throws `ConnectorManifestError('signature mismatch')`

- **Test**: `throws on invalid TTL`
  - Setup: Mock response with `ttlSeconds: -1` or `NaN`
  - Action: `loadConnectorServiceMap(options)`
  - Assert: Throws `ConnectorManifestError('Invalid generatedAt/ttlSeconds')`

#### Idempotency

- **Test**: `multiple calls with same URL return same data`
  - Setup: Call loader twice with identical options
  - Assert: Both return same manifest (HTTP caching may apply via ETag)

---

### 5. RegistryMemoryCache

#### Happy Path

- **Test**: `loads existing registry on init()`
  - Setup: Write `servers.json` with 3 servers to temp dir
  - Action: `init()`
  - Assert: `getAll()` returns 3 servers

- **Test**: `upsert adds new server`
  - Setup: Empty cache
  - Action: `upsert({ name: 'test', ... })`
  - Assert: `getAll()` includes 'test'

- **Test**: `remove deletes server`
  - Setup: Cache with server 'foo'
  - Action: `remove('foo')`
  - Assert: `getAll()` excludes 'foo'; returns `true`

#### Boundary Cases

- **Test**: `init() with missing file creates empty cache`
  - Setup: No `servers.json`
  - Action: `init()`
  - Assert: `getAll()` returns `[]`; no errors

- **Test**: `remove() non-existent server returns false`
  - Setup: Empty cache
  - Action: `remove('missing')`
  - Assert: Returns `false`

#### Error Paths

- **Test**: `init() tolerates corrupt JSON`
  - Setup: Write invalid JSON to `servers.json`
  - Action: `init()`
  - Assert: Logs warning; `getAll()` returns `[]`

- **Test**: `flush() handles write errors gracefully`
  - Setup: Make temp dir read-only
  - Action: `upsert(...)` → `flush()`
  - Assert: Logs error but doesn't crash; dirty flag remains true

#### Idempotency

- **Test**: `upsert same server updates in-place`
  - Setup: `upsert({ name: 'test', command: 'v1' })`
  - Action: `upsert({ name: 'test', command: 'v2' })`
  - Assert: `getAll()` has one 'test' with `command: 'v2'`

#### Flush Batching

- **Test**: `flush() writes all pending changes atomically`
  - Setup: `upsert(s1)`, `upsert(s2)`, `remove(s3)` without flush
  - Action: `flush()`
  - Assert: File contains s1, s2; excludes s3; atomic rename verified

- **Test**: `periodic flush triggers every N ms`
  - Setup: Create cache with `flushIntervalMs: 500`, use fake timers
  - Action: `upsert(...)`, advance timers by 500ms
  - Assert: `flush()` called automatically; file written

#### Crash Recovery

- **Test**: `close() flushes dirty state`
  - Setup: `upsert(...)` without explicit flush
  - Action: `close()`
  - Assert: File contains upserted server

- **Test**: `close() when clean skips write`
  - Setup: Init, no changes
  - Action: `close()`
  - Assert: No file write; no errors

---

### 6. fs-store Integration

#### Happy Path

- **Test**: `readAll() delegates to cache`
  - Setup: Populate cache with 2 servers
  - Action: `readAll()`
  - Assert: Returns 2 servers; no filesystem read

- **Test**: `upsert() delegates to cache`
  - Setup: Call `upsert({ name: 'test', ... })`
  - Assert: Cache contains 'test'; filesystem not written until flush

#### Lifecycle

- **Test**: `closeRegistryCache() flushes and clears singleton`
  - Setup: `upsert(...)` → `closeRegistryCache()`
  - Action: `readAll()` (creates new cache instance)
  - Assert: New cache loads from flushed file

---

## Fixtures & Mocks

### HTTP Mocks (Service Map)

```typescript
const mockServiceMapResponse = {
 connectors: [
  { id: 'conn1', name: 'Connector 1', endpoint: 'http://conn1', status: 'enabled', auth: { type: 'none' } },
  { id: 'conn2', name: 'Connector 2', endpoint: 'http://conn2', status: 'enabled', auth: { type: 'none' } },
 ],
 generatedAt: '2025-10-15T00:00:00.000Z',
 ttlSeconds: 300,
 signature: 'valid-signature-here',
};

vi.spyOn(global, 'fetch').mockResolvedValue({
 ok: true,
 json: async () => mockServiceMapResponse,
} as Response);
```

### Clock Mocks (Scheduler)

```typescript
beforeEach(() => {
 vi.useFakeTimers({ now: new Date('2025-10-15T00:00:00.000Z') });
});

afterEach(() => {
 vi.useRealTimers();
});
```

### Filesystem Mocks (Registry)

```typescript
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';

let tempDir: string;

beforeEach(async () => {
 tempDir = join(tmpdir(), `registry-test-${Date.now()}`);
 await fs.mkdir(tempDir, { recursive: true });
});

afterEach(async () => {
 await fs.rm(tempDir, { recursive: true, force: true });
});
```

### Logger Mocks

```typescript
const mockLogger = {
 info: vi.fn(),
 warn: vi.fn(),
 debug: vi.fn(),
 error: vi.fn(),
};
```

---

## Determinism Policy

### Time Control

- **All time-based tests**: Use `vi.useFakeTimers()` to control clock advancement
- **No `Date.now()`**: Accept `now?: () => number` option in components; tests inject fixed clock

### Random Control

- **Jitter tests**: Mock `Math.random()` with fixed values (0, 0.5, 1) to verify jitter bounds

```typescript
vi.spyOn(Math, 'random').mockReturnValue(0.5); // 0% jitter
```

### Network Determinism

- **All HTTP**: Mock `fetch` with predictable latencies (0ms, 100ms, 500ms, timeout)
- **No real network**: Tests never hit external endpoints

### Filesystem Determinism

- **Temp directories**: Use `tmpdir()` + timestamp to avoid collisions
- **Cleanup**: Always remove temp files in `afterEach`

---

## Coverage Target & Commands

### Target

- **Line Coverage**: ≥80%
- **Branch Coverage**: ≥80%
- **Function Coverage**: ≥90%

### Commands

```bash
# Run all MCP tests with coverage
pnpm --filter @cortex-os/mcp test:coverage

# Run all Registry tests with coverage
pnpm --filter @cortex-os/mcp-registry test:coverage

# Run specific test suite
pnpm --filter @cortex-os/mcp test -- refresh-scheduler
pnpm --filter @cortex-os/mcp test -- cache
pnpm --filter @cortex-os/mcp test -- manager
pnpm --filter @cortex-os/mcp test -- service-map

pnpm --filter @cortex-os/mcp-registry test -- memory-cache
pnpm --filter @cortex-os/mcp-registry test -- fs-store

# Generate coverage reports
pnpm --filter @cortex-os/mcp test:coverage -- --reporter=html
pnpm --filter @cortex-os/mcp-registry test:coverage -- --reporter=html

# Copy coverage to task verification folder
cp -r packages/mcp/coverage/html ~/tasks/mcp-performance-optimization/verification/coverage-mcp
cp -r packages/mcp-registry/coverage/html ~/tasks/mcp-performance-optimization/verification/coverage-registry
```

### Expected Output

- **JUnit XML**: `~/tasks/mcp-performance-optimization/test-logs/unit-tests.xml`
- **HTML Reports**: `~/tasks/mcp-performance-optimization/verification/coverage-{mcp,registry}/`
- **Summary**: Console output shows ≥80% for all metrics

---

## Test Execution Workflow (Red-Green-Refactor)

### Cycle 1: RefreshScheduler

1. **Red**: Write `refresh-scheduler.test.ts` with all case matrix tests → run → all fail
2. **Green**: Implement `RefreshScheduler` class → run → all pass
3. **Refactor**: Extract jitter calculation to pure function; re-run tests

### Cycle 2: ManifestCache

1. **Red**: Write `cache.test.ts` with TTL, stale-on-error tests → run → fail
2. **Green**: Implement `ManifestCache` class → run → pass
3. **Refactor**: Optimize expiry check; add type safety

### Cycle 3: Service Map (Agent Integration)

1. **Red**: Write `service-map.test.ts` with agent injection tests → run → fail
2. **Green**: Update `service-map.ts` to use `agent` option → run → pass
3. **Refactor**: Extract headers builder; validate

### Cycle 4: ConnectorProxyManager (Parallel Sync)

1. **Red**: Write `manager.test.ts` with parallel/failure isolation tests → run → fail
2. **Green**: Refactor `sync()` to use `Promise.allSettled` + `p-limit` → run → pass
3. **Refactor**: Extract connector processing to private method

### Cycle 5: RegistryMemoryCache

1. **Red**: Write `memory-cache.test.ts` with flush, recovery tests → run → fail
2. **Green**: Implement `RegistryMemoryCache` → run → pass
3. **Refactor**: Add error boundaries; validate atomic writes

### Cycle 6: fs-store Integration

1. **Red**: Write `fs-store.test.ts` with cache delegation tests → run → fail
2. **Green**: Update `fs-store.ts` to use `RegistryMemoryCache` → run → pass
3. **Refactor**: Add lifecycle hooks; document

---

## Performance Benchmarks

### Baseline Measurement (Before Optimization)

```typescript
// packages/mcp/src/connectors/__tests__/baseline.perf.test.ts
describe('Baseline Performance', () => {
 it('measures sequential sync time', async () => {
  const manager = createManagerWithSequentialSync(10); // 10 connectors
  const start = performance.now();
  await manager.sync();
  const duration = performance.now() - start;
  console.log(`Sequential sync (10 connectors): ${duration.toFixed(2)}ms`);
  // Expected: ~5000ms (10 * 500ms per connector)
 });
});
```

### Optimized Measurement (After Optimization)

```typescript
// packages/mcp/src/connectors/__tests__/optimized.perf.test.ts
describe('Optimized Performance', () => {
 it('measures parallel sync time', async () => {
  const manager = createManagerWithParallelSync(10); // 10 connectors
  const start = performance.now();
  await manager.sync();
  const duration = performance.now() - start;
  console.log(`Parallel sync (10 connectors): ${duration.toFixed(2)}ms`);
  // Expected: ~1500ms (10 / 4 concurrency * 500ms + overhead)
  expect(duration).toBeLessThan(2000);
 });

 it('validates ≥35% improvement', async () => {
  const baseline = await measureSequentialSync();
  const optimized = await measureParallelSync();
  const improvement = ((baseline - optimized) / baseline) * 100;
  console.log(`Improvement: ${improvement.toFixed(1)}%`);
  expect(improvement).toBeGreaterThanOrEqual(35);
 });
});
```

### Registry Performance

```typescript
// packages/mcp-registry/src/__tests__/registry.perf.test.ts
describe('Registry Performance', () => {
 it('measures flush latency', async () => {
  const cache = new RegistryMemoryCache({ registryPath, flushIntervalMs: 999999 });
  await cache.init();
  
  for (let i = 0; i < 100; i++) {
   cache.upsert({ name: `server-${i}`, command: 'test', args: [], env: {} });
  }

  const start = performance.now();
  await cache.flush();
  const duration = performance.now() - start;
  
  console.log(`Flush 100 servers: ${duration.toFixed(2)}ms`);
  expect(duration).toBeLessThan(50); // p95 < 50ms
 });
});
```

---

## Test Data Builders

### Connector Entry Factory

```typescript
export function createConnectorEntry(overrides?: Partial<ConnectorEntry>): ConnectorEntry {
 return {
  id: 'test-connector',
  name: 'Test Connector',
  endpoint: 'http://test-connector',
  status: 'enabled',
  auth: { type: 'none' },
  ...overrides,
 };
}
```

### Server Info Factory

```typescript
export function createServerInfo(overrides?: Partial<ServerInfo>): ServerInfo {
 return {
  name: 'test-server',
  command: 'node',
  args: ['server.js'],
  env: {},
  ...overrides,
 };
}
```

### Service Map Factory

```typescript
export function createServiceMapPayload(connectorCount: number): ServiceMapPayload & { signature: string } {
 return {
  connectors: Array.from({ length: connectorCount }, (_, i) =>
   createConnectorEntry({ id: `conn-${i}`, name: `Connector ${i}` })
  ),
  generatedAt: new Date().toISOString(),
  ttlSeconds: 300,
  signature: 'mock-signature',
 };
}
```

---

## Test Isolation & Cleanup

### Before Each Test

```typescript
beforeEach(async () => {
 vi.clearAllMocks();
 vi.useFakeTimers({ now: new Date('2025-10-15T00:00:00.000Z') });
 tempDir = await createTempDir();
});
```

### After Each Test

```typescript
afterEach(async () => {
 vi.useRealTimers();
 await cleanupTempDir(tempDir);
 // Ensure no leaked timers
 expect(vi.getTimerCount()).toBe(0);
});
```

---

## Mutation Testing (Optional)

If mutation testing is required:

```bash
# Install Stryker
pnpm add -D @stryker-mutator/core @stryker-mutator/vitest-runner

# Run mutation tests on critical paths
pnpm stryker run --mutate 'src/connectors/manager.ts,src/connectors/cache.ts'

# Target: ≥70% mutation score
```

---

## Test Artifacts & Reporting

### Outputs

1. **JUnit XML**: For CI integration

   ```bash
   pnpm test -- --reporter=junit --outputFile=~/tasks/mcp-performance-optimization/test-logs/unit-tests.xml
   ```

2. **Coverage HTML**: For manual review

   ```bash
   pnpm test:coverage -- --reporter=html
   ```

3. **Benchmark JSON**: For performance tracking

   ```typescript
   await fs.writeFile(
    '~/tasks/mcp-performance-optimization/test-logs/benchmark-results.json',
    JSON.stringify({ baseline: 5000, optimized: 1500, improvement: 70 })
   );
   ```

---

## Success Criteria

- [ ] All unit tests pass (≥80% coverage)
- [ ] All integration tests pass
- [ ] Performance benchmarks show ≥35% improvement
- [ ] No flaky tests (run 10x to verify determinism)
- [ ] Mutation score ≥70% (if applicable)
- [ ] Coverage reports exported to `~/tasks/mcp-performance-optimization/verification/`

---

**TDD Plan Status**: ✅ Complete and ready for test execution  
**Next Step**: Begin Cycle 1 (RefreshScheduler) with Red-Green-Refactor workflow
