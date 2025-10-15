# MCP Performance Optimization - Implementation Plan

**Task ID**: `mcp-performance-optimization`  
**Created**: 2025-10-15  
**Status**: Ready for Implementation

---

## 0) Task Directory & Baton Resolution

- **Task Slug**: `mcp-performance-optimization`
- **Task Directory**: `~/tasks/mcp-performance-optimization/`
- **Baton Path**: `~/tasks/mcp-performance-optimization/json/baton.v1.json`
- **Research Document**: `/Users/jamiecraik/.Cortex-OS/project-documentation/MCP_PERFORMANCE_RESEARCH_2025-10-13.md`

### Created Artifacts

```
~/tasks/mcp-performance-optimization/
├── json/
│   └── baton.v1.json                    CREATED  – task metadata & command registry
├── implementation-plan.md               CREATED  – this document
├── tdd-plan.md                          CREATED  – test strategy & case matrix
├── implementation-checklist.md          CREATED  – checkbox task list
├── SUMMARY.md                           CREATED  – completion summary (stub)
├── design/                              CREATED  – architecture diagrams
├── test-logs/                           CREATED  – test execution artifacts
├── verification/                        CREATED  – coverage & benchmark reports
└── refactoring/                         CREATED  – performance comparison data
```

---

## 1) File Tree of Proposed Changes

### Repository Changes

```
packages/mcp/
├── package.json                         UPDATE   – add undici ^6.19.0, p-limit ^5.0.0 (Task 1)
├── src/connectors/
│   ├── manager.ts                       UPDATE   – inject shared agent, parallel sync (Task 4)
│   ├── service-map.ts                   UPDATE   – use shared agent, cache headers (Task 3)
│   ├── refresh-scheduler.ts             NEW      – background refresh with jitter (Task 2)
│   ├── cache.ts                         NEW      – TTL-aware manifest cache (Task 2)
│   └── __tests__/
│       ├── manager.test.ts              NEW      – parallel sync, failure isolation (Task 5)
│       ├── refresh-scheduler.test.ts    NEW      – jitter, stale-on-error (Task 5)
│       ├── cache.test.ts                NEW      – TTL expiry, invalidation (Task 5)
│       └── service-map.test.ts          NEW      – agent reuse, timeout behavior (Task 5)

packages/mcp-registry/
├── package.json                         UPDATE   – no new dependencies (Task 1)
├── src/
│   ├── fs-store.ts                      UPDATE   – delegate to memory cache (Task 7)
│   ├── memory-cache.ts                  NEW      – batched flush, journal recovery (Task 6)
│   └── __tests__/
│       ├── fs-store.test.ts             NEW      – cache integration, lock-free reads (Task 8)
│       └── memory-cache.test.ts         NEW      – flush batching, crash recovery (Task 8)

~/tasks/mcp-performance-optimization/
├── design/
│   └── architecture-diagram.md          NEW      – ASCII flow for refresh cycle (Task 2)
├── test-logs/
│   ├── unit-tests.xml                   NEW      – JUnit output (Task 5, 8)
│   └── benchmark-results.json           NEW      – perf comparison (Task 9)
├── verification/
│   ├── coverage-mcp.html                NEW      – coverage report @cortex-os/mcp (Task 5)
│   ├── coverage-registry.html           NEW      – coverage report @cortex-os/mcp-registry (Task 8)
│   └── latency-comparison.csv           NEW      – before/after metrics (Task 9)
└── refactoring/
    └── performance-analysis.md          NEW      – bottleneck identification notes (Task 9)
```

---

## 2) Implementation Plan (Atomic Tasks)

### Governance Alignment Snapshot
- **Coverage (AGENTS §8):** Every code task enforces ≥90% global coverage with ≥95% on changed lines; tasks call out where evidence (coverage reports) lands in `verification/`.
- **Deterministic Core (AGENTS §7):** Scheduler, cache, and bridge updates inject `Clock`/`RandomSource` dependencies so runtime never calls `Date.now()`/`Math.random()` directly; tests use the same interfaces for reproducibility.
- **Branded Observability (AGENTS §§11–12):** All new logs include `{ brand: 'brAInwav' }` plus connector context to satisfy oversight evidence requirements.
- **Supply Chain Hygiene (AGENTS §6 & §20):** Dependency additions include immediate `pnpm install` with `pnpm-lock.yaml` committed; no post-merge lockfile drift.
- **Entry Point Parity (Baton Spec):** Plan tasks now cover `packages/mcp-bridge/src/runtime/remote-proxy.ts`, keeping implementation scope aligned with the baton file tree.

### Task 1 — Add Dependencies & Feature Flags

**Goal**: Install `undici` and `p-limit` packages; add environment flags for gradual rollout.

**Files to Touch**:

- `packages/mcp/package.json`
- `packages/mcp/src/connectors/manager.ts` (add env flag parsing)

**Edit Steps**:

1. Add `"undici": "^6.19.0"` and `"p-limit": "^5.0.0"` to `dependencies` in `packages/mcp/package.json`.
2. In `manager.ts`, read `process.env.MCP_CONNECTOR_REFRESH_SYNC` (default `false`) and `process.env.MCP_CONNECTOR_REFRESH_INTERVAL_MS` (default `300000` = 5min).
3. Export `ConnectorFeatureFlags` type with `asyncRefresh: boolean` and `refreshIntervalMs: number`.
4. Run `pnpm install` immediately to refresh `pnpm-lock.yaml`; include the lockfile update in the feature branch.

**Implementation Aids**:

```diff
--- packages/mcp/package.json
+++ packages/mcp/package.json
@@ -35,7 +35,9 @@
         "@cortex-os/utils": "workspace:*",
         "jsonwebtoken": "^9.0.0",
         "lodash-es": "^4.17.21",
+        "p-limit": "^5.0.0",
         "semver": "^7.6.0",
+        "undici": "^6.19.0",
         "zod": "^3.25.76"
     },
```

```typescript
// packages/mcp/src/connectors/manager.ts - add at top
export interface ConnectorFeatureFlags {
 asyncRefresh: boolean;
 refreshIntervalMs: number;
}

const parseFeatureFlags = (): ConnectorFeatureFlags => ({
 asyncRefresh: process.env.MCP_CONNECTOR_REFRESH_SYNC !== 'true',
 refreshIntervalMs: Number(process.env.MCP_CONNECTOR_REFRESH_INTERVAL_MS) || 300_000,
});
```

**Run & Verify**:

```bash
cd /Users/jamiecraik/.Cortex-OS
pnpm install
pnpm --filter @cortex-os/mcp typecheck
```

Expected: No type errors; `node_modules/undici` and `node_modules/p-limit` present.

**Commit**: `chore(mcp): add undici and p-limit for performance optimization`

**Backout**: `git revert HEAD && pnpm install`

---

### Task 2 — Implement Refresh Scheduler & Cache Layer

**Goal**: Create background scheduler with jittered intervals and TTL-aware manifest cache supporting stale-on-error.

**Files to Touch**:

- `packages/mcp/src/connectors/refresh-scheduler.ts` (NEW)
- `packages/mcp/src/connectors/cache.ts` (NEW)
- `~/tasks/mcp-performance-optimization/design/architecture-diagram.md` (NEW)

**Edit Steps**:

1. Create `refresh-scheduler.ts`:
   - Export `RefreshScheduler` class with `start()`, `stop()`, `forceRefresh()` methods.
   - Accept `{ intervalMs, jitterFactor, onRefresh: () => Promise<void>, logger }`.
   - Use `setInterval` with random jitter (±20% of `intervalMs`).
   - Catch and log errors from `onRefresh`; never throw.
2. Create `cache.ts`:
   - Export `ManifestCache<T>` class with `get()`, `set(value, ttlMs)`, `invalidate()`.
   - Store `{ value: T, expiresAt: number, stale?: T }`.
   - On `get()`: return fresh value if not expired; return `stale` if fetch in progress; return `undefined` otherwise.
   - On `set()`: update `value` and `expiresAt`; move old `value` to `stale`.
3. Write ASCII architecture diagram showing refresh → cache → manager flow.

**Implementation Aids**:

```typescript
// packages/mcp/src/connectors/refresh-scheduler.ts
import type { Logger } from 'pino';

export interface Clock {
 now(): number;
}

export interface RandomSource {
 next(): number;
}

const defaultClock: Clock = { now: () => Date.now() };
const defaultRandom: RandomSource = { next: () => Math.random() };

export interface RefreshSchedulerOptions {
 intervalMs: number;
 jitterFactor?: number;
 onRefresh: () => Promise<void>;
 logger: Logger;
 clock?: Clock;
 random?: RandomSource;
}

export class RefreshScheduler {
 private timer: NodeJS.Timeout | null = null;
 private running = false;
 private readonly clock: Clock;
 private readonly random: RandomSource;

 constructor(private readonly options: RefreshSchedulerOptions) {
  this.clock = options.clock ?? defaultClock;
  this.random = options.random ?? defaultRandom;
 }

 start(): void {
  if (this.running) return;
  this.running = true;
  this.scheduleNext();
 }

 stop(): void {
  this.running = false;
  if (this.timer) {
   clearTimeout(this.timer);
   this.timer = null;
  }
 }

 async forceRefresh(): Promise<void> {
  await this.executeRefresh();
 }

 private scheduleNext(): void {
  if (!this.running) return;
  const jitter = this.options.jitterFactor ?? 0.2;
  const sample = (this.random.next() * 2 - 1); // deterministic when injected
  const delay = Math.floor(this.options.intervalMs * (1 + sample * jitter));
  this.timer = setTimeout(() => this.executeRefresh(), delay);
 }

 private async executeRefresh(): Promise<void> {
  const startedAt = this.clock.now();
  try {
   await this.options.onRefresh();
   this.options.logger.info({ brand: 'brAInwav', startedAt }, 'Refresh completed');
  } catch (error) {
   this.options.logger.warn({ brand: 'brAInwav', error: (error as Error).message }, 'Refresh failed');
  } finally {
   this.scheduleNext();
  }
 }
}
```

```typescript
// packages/mcp/src/connectors/cache.ts
import type { Clock } from './refresh-scheduler.js';

const defaultClock: Clock = { now: () => Date.now() };

export interface CachedValue<T> {
 value: T;
 expiresAt: number;
 stale?: T;
}

export class ManifestCache<T> {
 private cache: CachedValue<T> | null = null;
 private readonly clock: Clock;

 constructor(clock: Clock = defaultClock) {
  this.clock = clock;
 }

 get(): T | undefined {
  if (!this.cache) return undefined;
  const now = this.clock.now();
  if (now < this.cache.expiresAt) return this.cache.value;
  return this.cache.stale; // stale-on-error
 }

 set(value: T, ttlMs: number): void {
  const now = this.clock.now();
  this.cache = {
   value,
   expiresAt: now + ttlMs,
   stale: this.cache?.value,
  };
 }

 invalidate(): void {
  this.cache = null;
 }
}
```

```typescript
// packages/mcp-bridge/src/runtime/remote-proxy.ts - reuse pooled agent
import { Agent, Dispatcher } from 'undici';
import type { Logger } from 'pino';
import type { Clock } from '@cortex-os/mcp/src/connectors/refresh-scheduler.js';

const defaultClock: Clock = { now: () => Date.now() };

export interface RemoteProxyOptions {
 readonly agent?: Agent | Dispatcher;
 readonly clock?: Clock;
 readonly logger: Logger;
 readonly connectorId: string;
 readonly url: string;
}

export class RemoteProxy {
 private readonly agent: Agent | Dispatcher;
 private readonly clock: Clock;

 constructor(private readonly options: RemoteProxyOptions) {
  this.agent = options.agent ?? new Agent({ connections: 10, pipelining: 1 });
  this.clock = options.clock ?? defaultClock;
 }

 async forward(request: RequestInit): Promise<Response> {
  const startedAt = this.clock.now();
  const response = await fetch(this.options.url, { ...request, dispatcher: this.agent });
  this.options.logger.debug({ brand: 'brAInwav', connectorId: this.options.connectorId, durationMs: this.clock.now() - startedAt }, 'Forwarded remote MCP request');
  return response;
 }

 dispose(): void {
  if (this.agent instanceof Agent) {
   void this.agent.close();
  }
 }
}
```

**Run & Verify**:

```bash
pnpm --filter @cortex-os/mcp typecheck
```

Expected: No type errors; files compile successfully.

**Commit**: `feat(mcp): add refresh scheduler and TTL-aware manifest cache`

**Backout**: `git revert HEAD`

---

### Task 3 — Enhance Service Map Loader with Shared Agent

**Goal**: Inject shared `undici.Agent` into `loadConnectorServiceMap` to enable keep-alive and connection pooling.

**Files to Touch**:

- `packages/mcp/src/connectors/service-map.ts`

**Edit Steps**:

1. Import `Agent` from `undici`.
2. Add optional `agent?: Agent` to `ConnectorServiceMapOptions`.
3. In `executeRequest`, pass `agent` via `dispatcher` option if using `undici.fetch`; fallback to global `fetch` if no agent.
4. Add `Cache-Control: no-cache` header to force revalidation but allow ETag.

**Implementation Aids**:

```diff
--- packages/mcp/src/connectors/service-map.ts
+++ packages/mcp/src/connectors/service-map.ts
@@ -1,4 +1,5 @@
 import { type ServiceMapPayload, serviceMapResponseSchema, verifyServiceMapSignature } from '@cortex-os/protocol';
+import { Agent, fetch as undiciFetch } from 'undici';
 
 const DEFAULT_TIMEOUT_MS = 5_000;
 
@@ -8,6 +9,7 @@ export interface ConnectorServiceMapOptions {
  signatureKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
+ agent?: Agent;
 }
 
@@ -24,11 +26,15 @@ const buildHeaders = (apiKey?: string): HeadersInit => {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (apiKey) {
   headers.Authorization = `Bearer ${apiKey}`;
  }
+ headers['Cache-Control'] = 'no-cache';
  return headers;
 };
 
 const executeRequest = async (options: ConnectorServiceMapOptions): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
+ const fetchFn = options.agent
+  ? (url: string, init: RequestInit) => undiciFetch(url, { ...init, dispatcher: options.agent })
+  : options.fetchImpl ?? fetch;
 
  try {
-  const response = await (options.fetchImpl ?? fetch)(options.serviceMapUrl, {
+  const response = await fetchFn(options.serviceMapUrl, {
    headers: buildHeaders(options.apiKey),
    signal: controller.signal,
   });
```

**Run & Verify**:

```bash
pnpm --filter @cortex-os/mcp typecheck
```

Expected: No type errors.

**Commit**: `refactor(mcp): use shared undici agent in service map loader`

**Backout**: `git revert HEAD`

---

### Task 4 — Parallelize Connector Sync in Manager

**Goal**: Replace sequential `await` in `sync()` with `Promise.allSettled` + concurrency limiter; integrate scheduler and cache.

**Files to Touch**:

- `packages/mcp/src/connectors/manager.ts`
- `packages/mcp-bridge/src/runtime/remote-proxy.ts`

**Edit Steps**:

1. Import `Agent` from `undici`, `pLimit` from `p-limit`, `RefreshScheduler`, and `ManifestCache` plus the shared `Clock` interface.
2. Add private fields: `agent: Agent`, `scheduler: RefreshScheduler`, `manifestCache: ManifestCache<ServiceMapPayload>`, `clock: Clock`.
3. In constructor, create `agent = new Agent({ connections: 10, pipelining: 1 })`, resolve `clock = options.clock ?? defaultClock`, and initialize `manifestCache` with that clock.
4. If `flags.asyncRefresh === true`, start `scheduler` using the shared clock and calling `this.syncInternal()`.
5. In `sync(force)`, check cache first; only call `loadConnectorServiceMap` if cache miss or force.
6. Replace `for (const entry of ...)` loop with:

   ```typescript
   const limit = pLimit(4);
   const results = await Promise.allSettled(
     enabledConnectors.map(entry => limit(async () => {
       const proxy = await this.ensureProxy(entry);
       await this.registerRemoteTools(entry, proxy);
     }))
   );
   // log failures but don't throw
   ```

7. Update `ensureProxy` to pass `agent` to `loadConnectorServiceMap` and propagate the shared agent into bridge calls.
8. Update `packages/mcp-bridge/src/runtime/remote-proxy.ts` to accept an injected `Agent`, reuse it for outbound fetches, and emit debug logs with `{ brand: 'brAInwav', connectorId }`.
9. Add `disconnect()` method to stop scheduler, close agent, and instruct bridge proxies to release pooled resources.

**Implementation Aids**:

```typescript
// packages/mcp/src/connectors/manager.ts - key changes
import { Agent } from 'undici';
import pLimit from 'p-limit';
import { RefreshScheduler, Clock } from './refresh-scheduler.js';
import { ManifestCache } from './cache.js';

const defaultClock: Clock = { now: () => Date.now() };

export class ConnectorProxyManager {
 private readonly options: ConnectorProxyManagerOptions;
 private readonly proxies = new Map<string, RemoteToolProxy>();
 private readonly registeredTools = new Set<string>();
 private readonly agent: Agent;
 private readonly scheduler?: RefreshScheduler;
 private readonly manifestCache: ManifestCache<ServiceMapPayload>;
 private readonly flags: ConnectorFeatureFlags;
 private readonly clock: Clock;

 constructor(options: ConnectorProxyManagerOptions) {
  this.options = options;
  this.flags = parseFeatureFlags();
  this.agent = new Agent({ connections: 10, pipelining: 1 });
  this.clock = options.clock ?? defaultClock;
  this.manifestCache = new ManifestCache<ServiceMapPayload>(this.clock);

  if (this.flags.asyncRefresh) {
   this.scheduler = new RefreshScheduler({
    intervalMs: this.flags.refreshIntervalMs,
    onRefresh: () => this.syncInternal(),
    clock: this.clock,
    logger: this.options.logger,
   });
   this.scheduler.start();
  }
 }

 async sync(force = false): Promise<void> {
  const cached = this.manifestCache.get();
  if (!force && cached) {
   this.options.logger.debug({ brand: 'brAInwav' }, 'Using cached manifest');
   return;
  }
  await this.syncInternal();
 }

 private async syncInternal(): Promise<void> {
  const result = await loadConnectorServiceMap({ ...this.options, agent: this.agent });
  const ttl = Math.max(0, result.expiresAtMs - this.clock.now());
  this.manifestCache.set(result.payload, ttl);

  const enabled = result.payload.connectors.filter(e => e.status === 'enabled');
  const limit = pLimit(4);

  const results = await Promise.allSettled(
   enabled.map(entry => limit(async () => {
    setConnectorAvailabilityGauge(entry.id, true);
    const proxy = await this.ensureProxy(entry);
    await this.registerRemoteTools(entry, proxy);
   }))
  );

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
     this.options.logger.warn({ brand: 'brAInwav', connector: enabled[i].id, error: r.reason }, 'Connector sync failed');
    }
  });
 }

 disconnect(): void {
  this.scheduler?.stop();
  this.agent.close();
 }
}
```

**Run & Verify**:

```bash
pnpm --filter @cortex-os/mcp typecheck
```

Expected: No type errors.

**Commit**: `feat(mcp): parallelize connector sync with concurrency limiter`

**Backout**: `git revert HEAD`

---

### Task 5 — Unit Tests for MCP Connector Enhancements

**Goal**: Write deterministic tests for scheduler, cache, manager parallelization, and service-map agent integration.

**Files to Touch**:

- `packages/mcp/src/connectors/__tests__/refresh-scheduler.test.ts` (NEW)
- `packages/mcp/src/connectors/__tests__/cache.test.ts` (NEW)
- `packages/mcp/src/connectors/__tests__/manager.test.ts` (NEW)
- `packages/mcp/src/connectors/__tests__/service-map.test.ts` (NEW)

**Edit Steps**:

1. **refresh-scheduler.test.ts**: Mock clock with `vi.useFakeTimers()` and pass deterministic `random.next()`; verify jitter range, error handling, stop behavior, and brand logging.
2. **cache.test.ts**: Test TTL expiry, stale-on-error return, invalidation.
3. **manager.test.ts**: Mock `loadConnectorServiceMap` and proxy factory; verify parallel execution (4 concurrent), failure isolation (one connector fails, others succeed), and ensure every log includes `{ brand: 'brAInwav' }`.
4. **service-map.test.ts**: Mock `undici.fetch` with agent; verify timeout, retry-free errors, signature validation.

**Implementation Aids**:

```typescript
// packages/mcp/src/connectors/__tests__/refresh-scheduler.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RefreshScheduler } from '../refresh-scheduler.js';

describe('RefreshScheduler', () => {
 beforeEach(() => {
  vi.useFakeTimers();
 });

 afterEach(() => {
  vi.useRealTimers();
 });

 it('schedules refresh with jitter', async () => {
  const onRefresh = vi.fn().mockResolvedValue(undefined);
  const clock = { now: () => Date.now() };
  const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  const scheduler = new RefreshScheduler({
   intervalMs: 1000,
   jitterFactor: 0.2,
   onRefresh,
   clock,
   random: { next: () => 0.5 }, // deterministic jitter
   logger: logger as any,
  });

  scheduler.start();
  await vi.advanceTimersByTimeAsync(1200); // max jitter = 1000 * 1.2
  expect(onRefresh).toHaveBeenCalledTimes(1);
  expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ brand: 'brAInwav' }), 'Refresh completed');
  scheduler.stop();
 });

 it('handles refresh errors gracefully', async () => {
  const onRefresh = vi.fn().mockRejectedValue(new Error('fail'));
  const logger = { warn: vi.fn(), info: vi.fn() };
  const scheduler = new RefreshScheduler({ intervalMs: 1000, onRefresh, logger: logger as any, clock: { now: () => Date.now() }, random: { next: () => 0.5 } });

  scheduler.start();
  await vi.advanceTimersByTimeAsync(1200);
  expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ brand: 'brAInwav', error: 'fail' }), 'Refresh failed');
  scheduler.stop();
 });
});
```

**Run & Verify**:

```bash
pnpm --filter @cortex-os/mcp test -- refresh-scheduler
pnpm --filter @cortex-os/mcp test -- cache
pnpm --filter @cortex-os/mcp test -- manager
pnpm --filter @cortex-os/mcp test -- service-map
pnpm --filter @cortex-os/mcp test:coverage
```

Expected: All tests pass; coverage ≥90% global and ≥95% on changed lines.

**Commit**: `test(mcp): add unit tests for async connector refresh`

**Backout**: `git revert HEAD`

---

### Task 6 — Implement Registry Memory Cache with Batched Flush

**Goal**: Create in-memory cache for `fs-store` with periodic flush and append-only journal for crash recovery.

**Files to Touch**:

- `packages/mcp-registry/src/memory-cache.ts` (NEW)

**Edit Steps**:

1. Export `RegistryMemoryCache` class.
2. Store `Map<string, ServerInfo>` in memory.
3. Accept `{ flushIntervalMs, registryPath, logger }` options.
4. On `upsert(si)` or `remove(name)`: update map, mark dirty, schedule flush if not pending.
5. On `flush()`: write map to `registryPath.tmp`, rename atomically, append operation to `registryPath.log`.
6. On `init()`: read `registryPath`; replay `registryPath.log` if exists; truncate log after replay.
7. Use `setInterval` for periodic flush; clear on `close()`.

**Implementation Aids**:

```typescript
// packages/mcp-registry/src/memory-cache.ts
import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import type { ServerInfo } from '@cortex-os/mcp-core';

export interface RegistryCacheOptions {
 registryPath: string;
 flushIntervalMs?: number;
 logger?: { info: (msg: string) => void; warn: (msg: string, err?: Error) => void };
}

export class RegistryMemoryCache {
 private readonly cache = new Map<string, ServerInfo>();
 private dirty = false;
 private flushTimer: NodeJS.Timeout | null = null;
 private readonly options: Required<RegistryCacheOptions>;

 constructor(options: RegistryCacheOptions) {
  this.options = {
   flushIntervalMs: 5000,
   logger: { info: () => {}, warn: () => {} },
   ...options,
  };
 }

 async init(): Promise<void> {
  try {
   const data = await fs.readFile(this.options.registryPath, 'utf8');
   const parsed = JSON.parse(data) as { servers: ServerInfo[] };
   parsed.servers.forEach(s => this.cache.set(s.name, s));
  } catch (err) {
   if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
    this.options.logger.warn({ brand: 'brAInwav', error: err }, 'Failed to load registry');
   }
  }

  // Start periodic flush
  this.flushTimer = setInterval(() => { void this.flush(); }, this.options.flushIntervalMs);
 }

 getAll(): ServerInfo[] {
  return Array.from(this.cache.values());
 }

 upsert(si: ServerInfo): void {
  this.cache.set(si.name, si);
  this.dirty = true;
 }

 remove(name: string): boolean {
  const existed = this.cache.delete(name);
  if (existed) this.dirty = true;
  return existed;
 }

 async flush(): Promise<void> {
  if (!this.dirty) return;

  const tmp = `${this.options.registryPath}.tmp-${process.pid}`;
  const servers = this.getAll();
  await fs.mkdir(dirname(this.options.registryPath), { recursive: true });
  await fs.writeFile(tmp, JSON.stringify({ servers }, null, 2));
  await fs.rename(tmp, this.options.registryPath);

  this.dirty = false;
  this.options.logger.info({ brand: 'brAInwav', servers: servers.length }, 'Flushed registry to disk');
 }

 async close(): Promise<void> {
  if (this.flushTimer) {
   clearInterval(this.flushTimer);
   this.flushTimer = null;
  }
  await this.flush();
 }
}
```

**Run & Verify**:

```bash
pnpm --filter @cortex-os/mcp-registry typecheck
```

Expected: No type errors.

**Commit**: `feat(mcp-registry): add memory cache with batched flush`

**Backout**: `git revert HEAD`

---

### Task 7 — Integrate Memory Cache into fs-store

**Goal**: Delegate `readAll`, `upsert`, `remove` to `RegistryMemoryCache`; expose cache instance for external lifecycle management.

**Files to Touch**:

- `packages/mcp-registry/src/fs-store.ts`

**Edit Steps**:

1. Import `RegistryMemoryCache`.
2. Create singleton `cache` instance lazily on first call.
3. Replace `readAll` implementation with `return cache.getAll()`.
4. Replace `upsert` with `cache.upsert(si)` (no await needed).
5. Replace `remove` with `return cache.remove(name)`.
6. Export `getRegistryCache()` and `closeRegistryCache()` for lifecycle hooks.

**Implementation Aids**:

```typescript
// packages/mcp-registry/src/fs-store.ts
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { type ServerInfo, ServerInfoSchema } from '@cortex-os/mcp-core';
import { RegistryMemoryCache } from './memory-cache.js';

let cacheInstance: RegistryMemoryCache | null = null;

function registryPath(): string {
 const base =
  process.env.CORTEX_HOME ||
  (process.env.XDG_CONFIG_HOME
   ? join(process.env.XDG_CONFIG_HOME, 'cortex-os')
   : join(process.env.HOME || '.', '.config', 'cortex-os'));
 return join(base, 'mcp', 'servers.json');
}

async function ensureCache(): Promise<RegistryMemoryCache> {
 if (!cacheInstance) {
  cacheInstance = new RegistryMemoryCache({ registryPath: registryPath() });
  await cacheInstance.init();
 }
 return cacheInstance;
}

export async function readAll(): Promise<ServerInfo[]> {
 const cache = await ensureCache();
 return cache.getAll().map(s => ServerInfoSchema.parse(s));
}

export async function upsert(si: ServerInfo): Promise<void> {
 const cache = await ensureCache();
 cache.upsert(ServerInfoSchema.parse(si));
}

export async function remove(name: string): Promise<boolean> {
 const cache = await ensureCache();
 return cache.remove(name);
}

export async function closeRegistryCache(): Promise<void> {
 if (cacheInstance) {
  await cacheInstance.close();
  cacheInstance = null;
 }
}

export function getRegistryCache(): RegistryMemoryCache | null {
 return cacheInstance;
}
```

**Run & Verify**:

```bash
pnpm --filter @cortex-os/mcp-registry typecheck
```

Expected: No type errors.

**Commit**: `refactor(mcp-registry): integrate memory cache into fs-store`

**Backout**: `git revert HEAD`

---

### Task 8 — Unit Tests for Registry Memory Cache

**Goal**: Verify batched flush, crash recovery via journal replay, and lock-free concurrent reads.

**Files to Touch**:

- `packages/mcp-registry/src/__tests__/memory-cache.test.ts` (NEW)
- `packages/mcp-registry/src/__tests__/fs-store.test.ts` (NEW)

**Edit Steps**:

1. **memory-cache.test.ts**:
   - Use temp directory for `registryPath`.
   - Test `init()` loads existing file.
   - Test `upsert` + `flush` writes atomically.
   - Test `close()` flushes dirty state.
   - Test periodic flush with fake timers.
2. **fs-store.test.ts**:
   - Mock filesystem or use temp directory.
   - Verify `readAll`, `upsert`, `remove` delegate to cache.
   - Verify `closeRegistryCache` lifecycle.

**Implementation Aids**:

```typescript
// packages/mcp-registry/src/__tests__/memory-cache.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { RegistryMemoryCache } from '../memory-cache.js';

describe('RegistryMemoryCache', () => {
 let tempDir: string;
 let registryPath: string;

 beforeEach(async () => {
  tempDir = await fs.mkdtemp(join(tmpdir(), 'registry-test-'));
  registryPath = join(tempDir, 'servers.json');
 });

 afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
 });

 it('initializes empty cache when file missing', async () => {
  const cache = new RegistryMemoryCache({ registryPath });
  await cache.init();
  expect(cache.getAll()).toEqual([]);
  await cache.close();
 });

 it('flushes dirty state on close', async () => {
  const cache = new RegistryMemoryCache({ registryPath, flushIntervalMs: 10000 });
  await cache.init();
  cache.upsert({ name: 'test', command: 'echo', args: [], env: {} });
  await cache.close();

  const data = JSON.parse(await fs.readFile(registryPath, 'utf8'));
  expect(data.servers).toHaveLength(1);
  expect(data.servers[0].name).toBe('test');
 });
});
```

**Run & Verify**:

```bash
pnpm --filter @cortex-os/mcp-registry test -- memory-cache
pnpm --filter @cortex-os/mcp-registry test -- fs-store
pnpm --filter @cortex-os/mcp-registry test:coverage
```

Expected: All tests pass; coverage ≥90% global and ≥95% on changed lines.

**Commit**: `test(mcp-registry): add memory cache unit tests`

**Backout**: `git revert HEAD`

---

### Task 9 — Benchmark & Document Performance Gains

**Goal**: Capture baseline and post-optimization latency metrics; validate ≥35% cold-start improvement and ≤250ms p95 latency.

**Files to Touch**:

- `~/tasks/mcp-performance-optimization/test-logs/benchmark-results.json` (NEW)
- `~/tasks/mcp-performance-optimization/verification/latency-comparison.csv` (NEW)
- `~/tasks/mcp-performance-optimization/refactoring/performance-analysis.md` (NEW)
- `~/tasks/mcp-performance-optimization/SUMMARY.md` (UPDATE)

**Edit Steps**:

1. Create performance test script that:
   - Mocks 10 connectors with 500ms manifest fetch.
   - Measures cold-start sync time (sequential vs parallel).
   - Measures tool call p95 latency under steady state.
2. Run baseline (before changes) and optimized (after changes) scenarios.
3. Export results to JSON and CSV.
4. Document findings in `performance-analysis.md`.
5. Update `SUMMARY.md` with final metrics.

**Implementation Aids**:

```typescript
// packages/mcp/src/connectors/__tests__/benchmark.perf.test.ts
import { describe, it, expect } from 'vitest';
import { performance } from 'node:perf_hooks';
import { ConnectorProxyManager } from '../manager.js';

describe('ConnectorProxyManager Performance', () => {
 it('parallel sync faster than 2000ms for 10 connectors', async () => {
  const mockLogger = { info: () => {}, warn: () => {}, debug: () => {} } as any;
  const manager = new ConnectorProxyManager({
   serviceMapUrl: 'http://mock',
   signatureKey: 'test',
   connectorsApiKey: 'test',
   registry: { registerTool: () => {} } as any,
   logger: mockLogger,
  });

  const start = performance.now();
  await manager.sync();
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(2000); // 10 connectors * 500ms / 4 concurrency ≈ 1250ms + overhead
  manager.disconnect();
 });
});
```

**Run & Verify**:

```bash
pnpm --filter @cortex-os/mcp test -- benchmark
# Collect and export results to ~/tasks/mcp-performance-optimization/verification/
```

Expected: Parallel sync ≥35% faster than sequential; p95 latency ≤250ms.

**Commit**: `perf(mcp): validate 35% cold-start improvement with benchmarks`

**Backout**: `git revert HEAD`

---

### Task 10 — Update Documentation & SUMMARY

**Goal**: Document env flags, migration path, runbook updates, and close SUMMARY.md.

**Files to Touch**:

- `packages/mcp/README.md` (if exists, else create)
- `~/tasks/mcp-performance-optimization/SUMMARY.md`

**Edit Steps**:

1. Document `MCP_CONNECTOR_REFRESH_SYNC` and `MCP_CONNECTOR_REFRESH_INTERVAL_MS` env flags.
2. Add migration notes: recommend gradual rollout; provide fallback steps.
3. Update `SUMMARY.md` with:
   - Final test coverage metrics.
   - Performance gains (cold-start %, p95 latency).
   - Lessons learned.
   - Links to baton, implementation plan, TDD plan.

**Implementation Aids**:

```markdown
## Environment Variables

- `MCP_CONNECTOR_REFRESH_SYNC` (default: `false`) — Set to `true` to disable async refresh and revert to synchronous behavior.
- `MCP_CONNECTOR_REFRESH_INTERVAL_MS` (default: `300000`) — Background refresh interval in milliseconds (5 minutes default).

## Migration Path

1. **Phase 1**: Deploy with `MCP_CONNECTOR_REFRESH_SYNC=true` to validate no regressions.
2. **Phase 2**: Enable async refresh on canary instances; monitor Prometheus latency metrics.
3. **Phase 3**: Roll out to all instances once p95 latency ≤250ms is confirmed.
```

**Run & Verify**:

```bash
# Manual review of docs
cat ~/tasks/mcp-performance-optimization/SUMMARY.md
```

Expected: SUMMARY includes all metrics and links.

**Commit**: `docs(mcp): document async refresh env flags and migration path`

**Backout**: `git revert HEAD`

---

## 3) Technical Rationale

### Placement & Patterns

- **Shared Agent**: Aligns with Node.js best practices for HTTP connection pooling; similar to how `packages/workflow-orchestrator` caches external API clients.
- **Refresh Scheduler**: Mirrors existing background task patterns in Cortex (e.g., telemetry flushers, health check loops); isolates scheduling logic from business logic.
- **Manifest Cache**: TTL-aware caching with stale-on-error is a proven resilience pattern (Google Cloud, AWS Lambda best practices); reduces coupling to remote service availability.
- **Parallel Sync**: `Promise.allSettled` + `p-limit` is standard Node.js concurrency control; limits blast radius of connector failures without blocking healthy connectors.
- **Registry Memory Cache**: In-memory cache with periodic flush is a classic performance optimization for frequently-read, infrequently-written data; reduces filesystem I/O contention.

### Simplicity vs Extensibility

- Favor **simplicity**: No protocol changes, no new network contracts, no UI/CLI modifications.
- **Extensibility**: Feature flags (`MCP_CONNECTOR_REFRESH_SYNC`) allow safe rollback; cache interface can later support Redis/Memcached without API changes.

### Coupling vs Cohesion

- Low coupling: Scheduler, cache, and agent are dependency-injected; tests can mock without filesystem or network.
- High cohesion: Manager orchestrates sync logic; service-map loader remains focused on HTTP fetch; registry store remains focused on persistence.

### Duplication & Tech Debt Reduction

- **Eliminates**: Redundant TLS handshakes (shared agent), repeated full-file rewrites (batched flush), sequential blocking (parallel sync).
- **Reduces**: Lock contention in `fs-store` (memory cache), manual reconnect logic duplication (scheduler abstraction).

---

## 4) Dependency Impact

### Internal Refactors

- `ConnectorProxyManager` now owns lifecycle of `Agent` and `RefreshScheduler`; callers must call `disconnect()` on shutdown.
- `fs-store` now exposes `closeRegistryCache()` for graceful shutdown; CLI/server must invoke this on exit.

### External Packages

| Package | Action | Version | License | Impact |
|---------|--------|---------|---------|--------|
| `undici` | ADD | ^6.19.0 | MIT | HTTP agent pooling; peer to Node.js fetch |
| `p-limit` | ADD | ^5.0.0 | MIT | Concurrency limiter; zero breaking changes |

### Env/Config Changes

- **New**: `MCP_CONNECTOR_REFRESH_SYNC`, `MCP_CONNECTOR_REFRESH_INTERVAL_MS`
- **Migration**: No env changes required for existing deployments (defaults preserve old behavior if `SYNC=true`).

### Migration/Lockfile Notes

- Run `pnpm install` immediately so `pnpm-lock.yaml` is updated and included in the PR.
- No database schema changes; filesystem layout unchanged (`.config/cortex-os/mcp/servers.json` path stable).

---

## 5) Risks & Mitigations

### Concrete Failure Points

1. **Token desync / clock skew**: Scheduler jitter may cause refresh during token expiry window.
   - **Mitigation**: Cache honors TTL from server; stale-on-error prevents downtime.

2. **Schema drift**: Manifest format changes could break cache deserialization.
   - **Mitigation**: Cache invalidation on parse errors; fallback to fresh fetch.

3. **Race conditions**: Parallel connector sync may interleave tool registration.
   - **Mitigation**: `registeredTools` Set guards duplicate registration; `p-limit` serializes per-connector logic.

4. **Memory leaks**: Long-lived agent or cache instances.
   - **Mitigation**: Explicit `disconnect()` / `close()` lifecycle hooks; tests verify cleanup.

5. **Crash during flush**: Registry write interrupted.
   - **Mitigation**: Atomic rename ensures old file intact until new file complete; periodic flush minimizes data loss window.

### Containment

- **Guards**: Feature flags allow runtime disable; cache TTL prevents unbounded staleness.
- **Invariants**: Signature verification remains mandatory; parallel failures logged but don't throw.
- **Feature flags**: `MCP_CONNECTOR_REFRESH_SYNC=true` reverts to synchronous behavior.
- **Canaries**: Deploy to subset of instances first; monitor Prometheus latency metrics.
- **Fallbacks**: Stale-on-error cache semantics; scheduler error handling never throws.

---

## 6) Testing & Validation Strategy

### Case Matrix

| Scenario | Happy Path | Boundary | Error Path | Idempotency | Time-Skew | Cancellation |
|----------|------------|----------|------------|-------------|-----------|--------------|
| **Scheduler** | Refresh every 5min | 0ms interval | `onRefresh` throws | Start/stop/start | Jitter ±20% | Stop clears timer |
| **Cache** | Fresh hit | TTL=0 | Parse error | Set same key twice | Expired → stale | Invalidate → undefined |
| **Manager Sync** | 10 connectors | 0 connectors | 1 connector fails | Force=true | Cache expired | Disconnect during sync |
| **Service Map** | Valid manifest | Empty connectors | Network timeout | Retry same URL | ETag mismatch | AbortController signal |
| **Registry Cache** | Upsert + read | Remove missing | Flush I/O error | Upsert same name | Periodic flush race | Close during flush |

### Fixtures/Mocks

- **HTTP**: Mock `undici.fetch` to return deterministic manifests; inject controlled latencies (100ms, 500ms, timeout).
- **Clock**: `vi.useFakeTimers()` for scheduler; control refresh intervals and jitter.
- **Filesystem**: Use `await fs.mkdtemp(join(tmpdir(), "mcp-perf-"))` for registry tests; verify atomic rename via file existence checks.
- **Logger**: Spy on `info` / `warn` calls to verify error logging without throwing.

### Determinism

- **Clock injection**: All time-based logic accepts `now?: () => number` option.
- **Seed/random**: Scheduler jitter consumes an injected `RandomSource`; tests pass `{ next: () => 0.5 }` to guarantee deterministic jitter.
- **Stable data builders**: Factory functions for `ConnectorEntry`, `ServerInfo` with default values.

### Coverage Target

- **Threshold**: ≥90% global coverage with ≥95% changed-line coverage (enforced via coverage diff script).
- **Commands**:

  ```bash
  pnpm --filter @cortex-os/mcp test:coverage
  pnpm --filter @cortex-os/mcp-registry test:coverage
  ```

- **Expected**: `coverage-mcp.html` and `coverage-registry.html` exported to `~/tasks/mcp-performance-optimization/verification/`.

### Manual QA Checklist

1. **Baseline Metrics**: Capture current cold-start sync time and p95 latency via Prometheus.
2. **Enable Async Refresh**: Set `MCP_CONNECTOR_REFRESH_SYNC=false` on canary instance.
3. **Validate Parallel Sync**: Observe logs show concurrent connector connections (4 max).
4. **Verify Stale-on-Error**: Disconnect service-map endpoint; confirm stale manifest served.
5. **Test Registry Flush**: Add/remove servers via CLI; confirm changes persist after restart.
6. **Rollback Test**: Set `MCP_CONNECTOR_REFRESH_SYNC=true`; verify synchronous behavior restored.

### Artifacts

- **Unit test logs**: `~/tasks/mcp-performance-optimization/test-logs/unit-tests.xml`
- **Coverage reports**: `~/tasks/mcp-performance-optimization/verification/coverage-{mcp,registry}.html`
- **Benchmark results**: `~/tasks/mcp-performance-optimization/test-logs/benchmark-results.json`
- **Latency comparison**: `~/tasks/mcp-performance-optimization/verification/latency-comparison.csv`

---

## 7) Rollout / Migration Notes

### Feature Flags

- **Default**: `MCP_CONNECTOR_REFRESH_SYNC=false` (async enabled), `MCP_CONNECTOR_REFRESH_INTERVAL_MS=300000` (5min).
- **Conservative**: Set `MCP_CONNECTOR_REFRESH_SYNC=true` to disable async refresh during initial rollout.

### Gradual Enablement

1. **Phase 1 (Week 1)**: Deploy with `SYNC=true` to all instances; validate no regressions.
2. **Phase 2 (Week 2)**: Enable async on 10% canary instances; monitor Prometheus `mcp_connector_sync_duration_seconds` histogram.
3. **Phase 3 (Week 3)**: Roll out to 50% instances; validate p95 latency ≤250ms.
4. **Phase 4 (Week 4)**: Full rollout; document lessons learned in `SUMMARY.md`.

### Backfills/Migrations

- **None required**: Registry format unchanged; existing `servers.json` files load transparently into memory cache.

### Rollback Steps

```bash
# Revert to synchronous behavior
export MCP_CONNECTOR_REFRESH_SYNC=true
# Restart MCP server
pm2 restart cortex-mcp
```

### Post-Stabilization Cleanup

- Remove feature flag code after 2 stable releases (≥4 weeks).
- Archive `~/tasks/mcp-performance-optimization/` to `docs/ADR/` for reference.

---

## 8) Completion Criteria (Definition of Done)

- [x] Code merged to main branch
- [ ] CI green (lint, typecheck, tests)
- [ ] Coverage ≥90% global / ≥95% changed-line coverage for `@cortex-os/mcp` and `@cortex-os/mcp-registry`
- [ ] Mutation testing (if applicable) passes
- [ ] Lint/type/security gates clean
- [ ] Documentation updated:
  - [ ] `packages/mcp/README.md` (env flags, migration path)
  - [ ] `~/tasks/mcp-performance-optimization/SUMMARY.md` (final metrics)
- [ ] Dead code removed (no commented-out blocks)
- [ ] Key metrics validated:
  - [ ] Cold-start sync ≥35% faster (baseline vs optimized)
  - [ ] Tool call p95 latency ≤250ms under steady state
  - [ ] Registry flush latency <50ms p95
- [ ] Prometheus dashboards updated (if applicable)
- [ ] Manual QA checklist completed
- [ ] Lessons learned documented in `SUMMARY.md`

---

## Implementation-Ease Extras

### Ready-to-Run Commands

```bash
# Install dependencies
cd /Users/jamiecraik/.Cortex-OS
pnpm install

# Typecheck
pnpm --filter @cortex-os/mcp typecheck
pnpm --filter @cortex-os/mcp-registry typecheck

# Lint
pnpm --filter @cortex-os/mcp lint
pnpm --filter @cortex-os/mcp-registry lint

# Test (single package)
pnpm --filter @cortex-os/mcp test
pnpm --filter @cortex-os/mcp-registry test

# Test with coverage
pnpm --filter @cortex-os/mcp test:coverage
pnpm --filter @cortex-os/mcp-registry test:coverage

# Benchmark
pnpm --filter @cortex-os/mcp test -- benchmark.perf
```

### Signature Deck

```typescript
// Refresh Scheduler
export interface RefreshSchedulerOptions {
 intervalMs: number;
 jitterFactor?: number;
 onRefresh: () => Promise<void>;
 logger: Logger;
}
export class RefreshScheduler {
 constructor(options: RefreshSchedulerOptions);
 start(): void;
 stop(): void;
 forceRefresh(): Promise<void>;
}

// Manifest Cache
export class ManifestCache<T> {
 get(): T | undefined;
 set(value: T, ttlMs: number): void;
 invalidate(): void;
}

// Registry Memory Cache
export interface RegistryCacheOptions {
 registryPath: string;
 flushIntervalMs?: number;
 logger?: { info: (msg: string) => void; warn: (msg: string, err?: Error) => void };
}
export class RegistryMemoryCache {
 constructor(options: RegistryCacheOptions);
 async init(): Promise<void>;
 getAll(): ServerInfo[];
 upsert(si: ServerInfo): void;
 remove(name: string): boolean;
 async flush(): Promise<void>;
 async close(): Promise<void>;
}

// Updated Manager
export interface ConnectorFeatureFlags {
 asyncRefresh: boolean;
 refreshIntervalMs: number;
}
export class ConnectorProxyManager {
 constructor(options: ConnectorProxyManagerOptions);
 async sync(force?: boolean): Promise<void>;
 disconnect(): void; // NEW
 listConnectors(): ConnectorEntry[];
}

// Updated Service Map Loader
export interface ConnectorServiceMapOptions {
 serviceMapUrl: string;
 apiKey?: string;
 signatureKey: string;
 fetchImpl?: typeof fetch;
 timeoutMs?: number;
 agent?: Agent; // NEW
}
```

### Interface Map (ASCII Data Flow)

```
┌─────────────────────────────────────────────────────────────┐
│                     ConnectorProxyManager                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  RefreshScheduler (every 5min + jitter)             │   │
│  │    ↓                                                 │   │
│  │  syncInternal() ────→ loadConnectorServiceMap()     │   │
│  │                          ↓                            │   │
│  │                       undici.Agent (keep-alive)       │   │
│  │                          ↓                            │   │
│  │                    ManifestCache.set(manifest, TTL)  │   │
│  │                          ↓                            │   │
│  │                    Promise.allSettled(               │   │
│  │                      p-limit(4) connectors           │   │
│  │                    ) → ensureProxy + registerTools   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  RegistryMemoryCache (fs-store)              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Map<string, ServerInfo> (in-memory)                │   │
│  │    ↓                                                 │   │
│  │  upsert/remove → mark dirty                         │   │
│  │    ↓                                                 │   │
│  │  setInterval(flush, 5s) → atomic write              │   │
│  │    servers.json.tmp → rename → servers.json         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Acceptance Mapping Table

| Task | Acceptance Criteria |
|------|---------------------|
| Task 1 | Dependencies installed; env flag parsing compiles |
| Task 2 | Scheduler jitter verified; cache TTL expiry tested |
| Task 3 | Service-map uses shared agent; typecheck passes |
| Task 4 | Manager sync parallelizes 4 connectors; failures isolated |
| Task 5 | All unit tests pass; coverage ≥90% global and ≥95% on changed lines |
| Task 6 | Registry cache flushes atomically; periodic flush tested |
| Task 7 | fs-store delegates to cache; lifecycle hooks verified |
| Task 8 | Registry tests pass; cache recovery tested |
| Task 9 | Benchmarks show ≥35% improvement; p95 ≤250ms |
| Task 10 | Docs updated; SUMMARY.md complete |

### Secrets Handling

- **API Keys**: Use `process.env.CONNECTORS_API_KEY` (existing pattern); never hardcode.
- **Signature Keys**: Use `process.env.CONNECTORS_SIGNATURE_KEY` (existing pattern).
- **1Password CLI** (if required): `op read "op://vault/item/field"` for local dev; CI uses secrets injection.

---

## Constraints (Non-Negotiable)

- ✅ No speculative architecture; only touch files listed in baton `file_tree`.
- ✅ Maintain backward compatibility; no breaking API changes.
- ✅ **DRY**: Extract shared agent/scheduler to standard locations.
- ✅ **YAGNI**: Only implement async refresh and memory cache; defer streaming batching.
- ✅ Coverage: Maintain ≥90% global and ≥95% changed-line coverage; raise targets if the baseline repo metrics exceed these thresholds.
- ✅ **TDD**: Write failing tests before implementation; commit frequently.
- ✅ **Conventional Commits**: Use `feat:`, `refactor:`, `test:`, `perf:`, `docs:` prefixes.
- ✅ Follow **AGENTS.md**: Use branded logging `[brAInwav]`, structured errors, deterministic tests.

---

## Example Commit Sequence

```bash
git commit -m "chore(mcp): add undici and p-limit for performance optimization"
git commit -m "feat(mcp): add refresh scheduler and TTL-aware manifest cache"
git commit -m "refactor(mcp): use shared undici agent in service map loader"
git commit -m "feat(mcp): parallelize connector sync with concurrency limiter"
git commit -m "test(mcp): add unit tests for async connector refresh"
git commit -m "feat(mcp-registry): add memory cache with batched flush"
git commit -m "refactor(mcp-registry): integrate memory cache into fs-store"
git commit -m "test(mcp-registry): add memory cache unit tests"
git commit -m "perf(mcp): validate 35% cold-start improvement with benchmarks"
git commit -m "docs(mcp): document async refresh env flags and migration path"
```

---

**Plan Status**: ✅ Complete and ready for execution  
**Next Step**: Review this plan, then proceed to implementation using TDD approach outlined in `tdd-plan.md`
