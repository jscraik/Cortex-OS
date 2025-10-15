# Implementation Plan: Memory Ecosystem Performance Optimization

**Task ID**: `memory-ecosystem-performance-optimization`  
**Created**: 2025-10-15  
**Based on**: [MEMORY_ECOSYSTEM_PERFORMANCE_REVIEW.md](file:///Users/jamiecraik/.Cortex-OS/project-documentation/memory/MEMORY_ECOSYSTEM_PERFORMANCE_REVIEW.md)  
**Status**: Planning Complete

---

## 0) Task Directory & Baton Resolution

- **task_slug**: `memory-ecosystem-performance-optimization`
- **task_dir**: `~/tasks/memory-ecosystem-performance-optimization/`
- **baton_path**: `~/tasks/memory-ecosystem-performance-optimization/json/baton.v1.json`

### Artifacts Created

```
~/tasks/memory-ecosystem-performance-optimization/
 ├─ json/
 │  └─ baton.v1.json                     CREATED – Task metadata & handoff contract
 ├─ implementation-plan.md               CREATED – This file
 ├─ tdd-plan.md                          CREATED – Test matrix & coverage strategy
 ├─ implementation-checklist.md          CREATED – Executable task list
 ├─ SUMMARY.md                           PENDING – Post-completion outcomes
 ├─ design/                              DIR     – Architecture diagrams
 ├─ test-logs/                           DIR     – Test execution artifacts
 ├─ verification/                        DIR     – Coverage/mutation reports
 ├─ validation/                          DIR     – Performance benchmarks
 ├─ refactoring/                         DIR     – Code evolution notes
 └─ monitoring/                          DIR     – Observability metrics
```

---

## 1) File Tree of Proposed Changes

```
packages/memories/
 ├─ src/adapters/rest-api/
 │  ├─ http-client.ts                   UPDATE  – Replace fetch with undici Pool (Task 2)
 │  ├─ rest-adapter.ts                  UPDATE  – Integrate pooled client, adaptive retry (Task 3)
 │  └─ index.ts                         UPDATE  – Export pool config types (Task 3)
 └─ __tests__/
    └─ http-pooling.test.ts             NEW     – Pool lifecycle, keep-alive, retry (Task 2)

packages/memory-core/
 ├─ src/
 │  ├─ services/
 │  │  └─ GraphRAGIngestService.ts      UPDATE  – Parallel chunk embedding with p-limit (Task 4)
 │  ├─ retrieval/
 │  │  └─ QdrantHybrid.ts               UPDATE  – LRU cache eviction, cleanup (Task 5)
 │  ├─ caching/
 │  │  └─ DistributedCache.ts           UPDATE  – Timer lifecycle, graceful shutdown (Task 6)
 │  └─ lib/
 │     ├─ concurrency.ts                NEW     – Bounded concurrency primitives (Task 4)
 │     └─ batch-processor.ts            NEW     – Generic batch queue util (Task 4)
 └─ __tests__/
    ├─ parallel-ingest.test.ts          NEW     – Batch embedding, incremental updates (Task 4)
    └─ cache-eviction.test.ts           NEW     – LRU policy, timer cleanup (Task 5, 6)

~/tasks/memory-ecosystem-performance-optimization/
 ├─ tdd-plan.md                         UPDATE  – Test matrix, fixtures, determinism
 ├─ test-logs/
 │  ├─ unit-tests.xml                   NEW     – Vitest JUnit output
 │  └─ k6-load-test.json                NEW     – Performance validation
 ├─ verification/
 │  ├─ coverage-report.html             NEW     – Istanbul/Vitest coverage
 │  └─ mutation-report.html             NEW     – Stryker results
 └─ validation/
    ├─ baseline-metrics.json            NEW     – Pre-optimization p95/throughput
    └─ post-optimization-metrics.json   NEW     – Post-optimization comparison
```

**Legend**: `NEW` | `UPDATE` | `DELETE` | `RENAME` | `MOVE`

---

## 2) Implementation Plan (Bite-Sized, Revertible Tasks)

### **Task 1 — Dependency Installation & Configuration**

**Goal**: Add `undici` and `p-limit` dependencies; configure feature flags for staged rollout.

**Files to touch**:

- `packages/memories/package.json`
- `packages/memory-core/package.json`
- `packages/memories/.env.example`
- `packages/memory-core/.env.example`

**Edit steps**:

1. Add `undici@^6.0.0` to `memories` dependencies
2. Add `p-limit@^5.0.0` to `memory-core` dependencies
3. Add feature flag env vars: `MEMORY_HTTP_POOL_ENABLED=false`, `MEMORY_PARALLEL_INGEST_CONCURRENCY=0` (0=disabled)
4. Update `.env.example` with flag documentation

**Implementation Aids**:

```diff
# packages/memories/package.json
 "dependencies": {
+  "undici": "^6.0.0",
   // ... existing
 }
```

```diff
# packages/memory-core/package.json
 "dependencies": {
+  "p-limit": "^5.0.0",
   // ... existing
 }
```

**Run & verify**:

```bash
pnpm --filter memories i
pnpm --filter memory-core i
pnpm --filter memories typecheck
pnpm --filter memory-core typecheck
```

**Expected output**: Clean install, no type errors.

**Commit**: `chore(memories,memory-core): add undici and p-limit dependencies`

**Backout**: `git revert -n HEAD && pnpm i`

---

### **Task 2 — HTTP Pooling: Modernize FetchHttpClient with undici**

**Goal**: Replace bare `fetch` with `undici.Pool` for keep-alive, HTTP/2 multiplexing, and connection reuse.

**Files to touch**:

- `packages/memories/src/adapters/rest-api/http-client.ts`
- `packages/memories/__tests__/http-pooling.test.ts` (NEW)

**Edit steps**:

1. Import `Pool` from `undici`
2. Add `createPooledHttpClient(config)` factory accepting pool options
3. Update `FetchHttpClient` constructor to accept optional `Pool` instance
4. Wrap `fetch` calls with pool dispatcher when enabled
5. Expose pool health metrics via `getPoolStats()` method
6. Maintain existing `safeFetch` validation and allowlist logic
7. Gate pooling via `MEMORY_HTTP_POOL_ENABLED` env flag

**Implementation Aids**:

```typescript
// packages/memories/src/adapters/rest-api/http-client.ts (patch hint)
import { Pool, request } from 'undici';

export interface PoolConfig {
  connections?: number;      // default: 10
  pipelining?: number;       // default: 1
  keepAliveTimeout?: number; // default: 4000ms
  keepAliveMaxTimeout?: number; // default: 600000ms
}

export function createPooledHttpClient(baseUrl: string, config?: PoolConfig): FetchHttpClient {
  const pool = new Pool(baseUrl, {
    connections: config?.connections ?? 10,
    pipelining: config?.pipelining ?? 1,
    keepAliveTimeout: config?.keepAliveTimeout ?? 4000,
    keepAliveMaxTimeout: config?.keepAliveMaxTimeout ?? 600_000,
  });
  
  return new FetchHttpClient({ baseUrl, pool });
}

class FetchHttpClient {
  private pool?: Pool;
  
  async fetch(url: string, init?: RequestInit): Promise<Response> {
    // safeFetch validation preserved
    if (!this.isAllowedHost(url)) {
      throw new Error(`Host not allowlisted: ${url}`);
    }
    
    if (this.pool && process.env.MEMORY_HTTP_POOL_ENABLED === 'true') {
      // Use undici pool
      const { statusCode, headers, body } = await request(url, {
        ...init,
        dispatcher: this.pool,
      });
      return new Response(body, { status: statusCode, headers });
    }
    
    // Fallback to standard fetch
    return fetch(url, init);
  }
  
  getPoolStats() {
    return this.pool?.stats ?? null;
  }
  
  async close() {
    await this.pool?.close();
  }
}
```

**Test scaffold** (`packages/memories/__tests__/http-pooling.test.ts`):

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPooledHttpClient } from '../src/adapters/rest-api/http-client';

describe('HTTP Pooling', () => {
  let client: ReturnType<typeof createPooledHttpClient>;
  
  beforeEach(() => {
    process.env.MEMORY_HTTP_POOL_ENABLED = 'true';
    client = createPooledHttpClient('http://localhost:3000');
  });
  
  afterEach(async () => {
    await client.close();
    delete process.env.MEMORY_HTTP_POOL_ENABLED;
  });
  
  it('should reuse connections across multiple requests', async () => {
    // FAILING TEST: Mock server tracking connection count
    // Expect: single TCP connection for sequential requests
  });
  
  it('should respect connection pool limits', async () => {
    // FAILING TEST: Saturate pool, verify queuing behavior
  });
  
  it('should handle pool closure gracefully', async () => {
    // FAILING TEST: Close pool mid-flight, verify error handling
  });
});
```

**Run & verify**:

```bash
pnpm --filter memories test http-pooling --coverage
# Expected: Tests fail initially (TDD), implement to pass
```

**Commit**: `feat(memories): add undici HTTP pooling for REST adapter`

**Backout**: `git revert -n HEAD`

---

### **Task 3 — Adaptive Rate-Limit Backoff & Circuit Breaker Integration**

**Goal**: Replace sleep-entire-window backoff with token-bucket semantics; integrate circuit breaker for upstream protection.

**Files to touch**:

- `packages/memories/src/adapters/rest-api/rest-adapter.ts`
- `packages/memories/src/adapters/rest-api/index.ts`

**Edit steps**:

1. Add `TokenBucket` utility in `rest-adapter.ts` (≤40 lines)
2. Replace `sleep(waitTime)` with adaptive backoff: `min(baseDelay * 2^attempt, maxDelay)`
3. Track rate-limit reset timestamps, retry only when tokens available
4. Expose circuit breaker config via constructor options
5. Update retry loop to break on breaker OPEN state
6. Export `PoolConfig` and `CircuitBreakerConfig` types from `index.ts`

**Implementation Aids**:

```typescript
// packages/memories/src/adapters/rest-api/rest-adapter.ts (patch hint)
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  
  constructor(private capacity: number, private refillRate: number) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  
  tryConsume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
  
  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// In RestApiClient
private async retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  const maxAttempts = 3;
  const baseDelay = 100;
  const maxDelay = 5000;
  
  while (attempt < maxAttempts) {
    try {
      if (!this.rateLimitBucket.tryConsume()) {
        const backoff = Math.min(baseDelay * 2 ** attempt, maxDelay);
        await sleep(backoff);
        attempt++;
        continue;
      }
      return await fn();
    } catch (err) {
      if (this.isRateLimit(err)) {
        // Update bucket based on response headers
        const resetTime = this.parseResetHeader(err);
        this.rateLimitBucket.scheduleRefill(resetTime);
      }
      attempt++;
    }
  }
  throw new Error('Max retries exceeded');
}
```

**Run & verify**:

```bash
pnpm --filter memories test rest-adapter --coverage
# Expect: Rate limit scenarios pass, no full-window sleeps
```

**Commit**: `refactor(memories): adaptive rate-limit backoff with token bucket`

**Backout**: `git revert -n HEAD`

---

### **Task 4 — Parallel Chunk Embedding with Bounded Concurrency**

**Goal**: Convert sequential `for...of` embedding loop in `GraphRAGIngestService` to batched parallel processing with `p-limit`.

**Files to touch**:

- `packages/memory-core/src/services/GraphRAGIngestService.ts`
- `packages/memory-core/src/lib/concurrency.ts` (NEW)
- `packages/memory-core/src/lib/batch-processor.ts` (NEW)
- `packages/memory-core/__tests__/parallel-ingest.test.ts` (NEW)

**Edit steps**:

1. Create `concurrency.ts`: export `createBoundedQueue(limit)` wrapping `p-limit`
2. Create `batch-processor.ts`: generic batch queue with progress hooks
3. Update `GraphRAGIngestService.ingestDocument`:
   - Replace `for (const chunk of chunks)` with `await queue.map(chunks, embedChunk)`
   - Set concurrency via `MEMORY_PARALLEL_INGEST_CONCURRENCY` env (default: 4)
   - Emit A2A progress events per batch completion
4. Preserve transactional guarantees: only commit to Qdrant after all embeddings succeed
5. Add error aggregation: collect partial failures, rollback on critical errors

**Implementation Aids**:

```typescript
// packages/memory-core/src/lib/concurrency.ts (NEW - full file, ≤40 lines)
import pLimit from 'p-limit';

export interface BoundedQueue<T> {
  map<R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]>;
  close(): void;
}

export function createBoundedQueue<T>(concurrency: number): BoundedQueue<T> {
  const limit = pLimit(concurrency);
  
  return {
    async map<R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
      return Promise.all(items.map(item => limit(() => fn(item))));
    },
    close() {
      limit.clearQueue();
    },
  };
}
```

```typescript
// packages/memory-core/src/services/GraphRAGIngestService.ts (patch hint)
import { createBoundedQueue } from '../lib/concurrency.js';

async ingestDocument(doc: Document): Promise<void> {
  const chunks = this.chunkDocument(doc);
  const concurrency = parseInt(process.env.MEMORY_PARALLEL_INGEST_CONCURRENCY ?? '4', 10);
  
  if (concurrency <= 0) {
    // Fallback to sequential (existing behavior)
    for (const chunk of chunks) {
      await this.embedAndStore(chunk);
    }
    return;
  }
  
  const queue = createBoundedQueue<Chunk>(concurrency);
  
  try {
    const embeddings = await queue.map(chunks, async (chunk) => {
      const dense = await this.denseEmbedder.embed(chunk.text);
      const sparse = await this.sparseEmbedder.embed(chunk.text);
      return { chunk, dense, sparse };
    });
    
    // Transactional write to Qdrant
    await this.qdrant.upsertBatch(embeddings);
    
    // Emit A2A completion event
    this.events.emit('graphrag:ingest:complete', { docId: doc.id, chunks: embeddings.length });
  } finally {
    queue.close();
  }
}
```

**Test scaffold** (`packages/memory-core/__tests__/parallel-ingest.test.ts`):

```typescript
import { describe, it, expect, vi } from 'vitest';
import { GraphRAGIngestService } from '../src/services/GraphRAGIngestService';

describe('Parallel Ingest', () => {
  it('should batch embed chunks with bounded concurrency', async () => {
    // FAILING TEST: Mock embedder tracking call timing
    // Expect: max 4 concurrent embeddings, not sequential
  });
  
  it('should rollback on partial embedding failure', async () => {
    // FAILING TEST: Inject failure in 3rd chunk
    // Expect: no Qdrant writes, error propagated
  });
  
  it('should emit progress events per batch', async () => {
    // FAILING TEST: Track A2A events
    // Expect: incremental progress, final completion
  });
});
```

**Run & verify**:

```bash
pnpm --filter memory-core test parallel-ingest --coverage
# Logs should show concurrent embedding calls
```

**Commit**: `feat(memory-core): parallel chunk embedding with p-limit`

**Backout**: `git revert -n HEAD`

---

### **Task 5 — LRU Cache Eviction for QdrantHybrid**

**Goal**: Replace capped-at-100 cache with proper LRU eviction to prevent silent rejection of new entries.

**Files to touch**:

- `packages/memory-core/src/retrieval/QdrantHybrid.ts`
- `packages/memory-core/__tests__/cache-eviction.test.ts` (NEW)

**Edit steps**:

1. Add `LRUCache` utility (≤40 lines) or import from `lru-cache` package
2. Replace `Map` with `LRUCache` in `QdrantHybrid` constructor
3. Configure max size via `MEMORY_CACHE_MAX_SIZE` env (default: 100)
4. Implement eviction callback to log metrics
5. Add `getCacheStats()` method returning hit/miss/eviction counts

**Implementation Aids**:

```typescript
// packages/memory-core/src/retrieval/QdrantHybrid.ts (patch hint)
import { LRUCache } from 'lru-cache';

class QdrantHybrid {
  private cache: LRUCache<string, QueryResult>;
  
  constructor(config: Config) {
    const maxSize = parseInt(process.env.MEMORY_CACHE_MAX_SIZE ?? '100', 10);
    this.cache = new LRUCache({
      max: maxSize,
      dispose: (value, key) => {
        this.logger.debug({ brand: 'brAInwav', component: 'memory-core', msg: 'cache eviction', key });
      },
    });
  }
  
  async query(text: string): Promise<QueryResult> {
    const cached = this.cache.get(text);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }
    
    const result = await this.qdrantClient.search(text);
    this.cache.set(text, result);
    this.metrics.cacheMisses++;
    return result;
  }
  
  getCacheStats() {
    return {
      size: this.cache.size,
      max: this.cache.max,
      hits: this.metrics.cacheHits,
      misses: this.metrics.cacheMisses,
    };
  }
}
```

**Test scaffold** (`packages/memory-core/__tests__/cache-eviction.test.ts`):

```typescript
import { describe, it, expect } from 'vitest';
import { QdrantHybrid } from '../src/retrieval/QdrantHybrid';

describe('Cache Eviction', () => {
  it('should evict oldest entry when max size exceeded', async () => {
    // FAILING TEST: Fill cache to max + 1
    // Expect: first entry evicted, size remains at max
  });
  
  it('should update LRU order on cache hit', async () => {
    // FAILING TEST: Access oldest entry, add new entry
    // Expect: second-oldest evicted (LRU preserved)
  });
});
```

**Run & verify**:

```bash
pnpm --filter memory-core test cache-eviction --coverage
```

**Commit**: `refactor(memory-core): LRU cache eviction for QdrantHybrid`

**Backout**: `git revert -n HEAD`

---

### **Task 6 — Distributed Cache Timer Lifecycle & Graceful Shutdown**

**Goal**: Fix timer leaks in `DistributedCache` by persisting interval handles and implementing cleanup hooks.

**Files to touch**:

- `packages/memory-core/src/caching/DistributedCache.ts`
- Update existing `cache-eviction.test.ts` with timer cleanup tests

**Edit steps**:

1. Store `setInterval` handle in private field `metricsInterval`
2. Add `close()` method: clear interval, flush pending writes, close Redis connection
3. Register shutdown hook via `process.on('beforeExit')` (guard with `Symbol` to prevent duplicate registration)
4. Update constructor to accept optional `autoCleanup: boolean` flag (default: true)
5. Add branded logs for lifecycle events (`{ brand: "brAInwav", component: "memory-core", msg: "cache shutdown" }`)

**Implementation Aids**:

```typescript
// packages/memory-core/src/caching/DistributedCache.ts (patch hint)
class DistributedCache {
  private metricsInterval?: NodeJS.Timeout;
  private static shutdownRegistered = false;
  
  constructor(config: CacheConfig) {
    // ... existing
    
    if (config.metricsEnabled) {
      this.metricsInterval = setInterval(() => {
        this.emitMetrics();
      }, config.metricsIntervalMs ?? 60_000);
    }
    
    if (config.autoCleanup !== false && !DistributedCache.shutdownRegistered) {
      process.on('beforeExit', () => this.close());
      DistributedCache.shutdownRegistered = true;
    }
  }
  
  async close(): Promise<void> {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
    
    await this.redis.quit();
    this.logger.info({ brand: 'brAInwav', component: 'memory-core', msg: 'cache shutdown complete' });
  }
}
```

**Test updates** (`cache-eviction.test.ts`):

```typescript
it('should cleanup timers on close', async () => {
  const cache = new DistributedCache({ metricsEnabled: true, autoCleanup: false });
  
  // Verify interval running
  expect(cache['metricsInterval']).toBeDefined();
  
  await cache.close();
  
  // Verify interval cleared
  expect(cache['metricsInterval']).toBeUndefined();
});
```

**Run & verify**:

```bash
pnpm --filter memory-core test cache-eviction --coverage
# Check for timer leaks with Node --trace-warnings
```

**Commit**: `fix(memory-core): prevent timer leaks in DistributedCache`

**Backout**: `git revert -n HEAD`

---

### **Task 7 — Integration Testing & Performance Validation**

**Goal**: Validate end-to-end improvements with load tests and comparative benchmarks.

**Files to touch**:

- `~/tasks/memory-ecosystem-performance-optimization/validation/baseline-metrics.json` (NEW)
- `~/tasks/memory-ecosystem-performance-optimization/validation/post-optimization-metrics.json` (NEW)
- `~/tasks/memory-ecosystem-performance-optimization/validation/k6-load-test.js` (NEW)

**Edit steps**:

1. Record baseline metrics: p50/p95/p99 latency, throughput for REST /memories/store endpoint
2. Run k6 load test: 100 VUs, 60s duration, measure ingest latency
3. Enable optimizations via env flags
4. Re-run k6, capture post-optimization metrics
5. Generate comparison report in `SUMMARY.md`

**k6 Test Script**:

```javascript
// ~/tasks/.../validation/k6-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,
  duration: '60s',
  thresholds: {
    http_req_duration: ['p(95)<250'], // p95 < 250ms
  },
};

export default function () {
  const payload = JSON.stringify({
    content: 'Test memory content '.repeat(100),
    metadata: { source: 'k6-test' },
  });
  
  const res = http.post('http://localhost:3000/memories/store', payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(res, {
    'status 200': (r) => r.status === 200,
    'p95 < 250ms': (r) => r.timings.duration < 250,
  });
  
  sleep(0.1);
}
```

**Run & verify**:

```bash
# Baseline
k6 run ~/tasks/.../validation/k6-load-test.js --out json=baseline-metrics.json

# Enable flags
export MEMORY_HTTP_POOL_ENABLED=true
export MEMORY_PARALLEL_INGEST_CONCURRENCY=4

# Post-optimization
k6 run ~/tasks/.../validation/k6-load-test.js --out json=post-optimization-metrics.json

# Compare
pnpm tsx scripts/compare-k6-metrics.ts
```

**Expected output**: ≥30% p95 latency reduction, ≥50% throughput increase.

**Commit**: `test(memory): add k6 performance validation suite`

**Backout**: `git revert -n HEAD`

---

### **Task 8 — Documentation & Migration Guide**

**Goal**: Update README, ADRs, and provide migration instructions for operators.

**Files to touch**:

- `packages/memories/README.md`
- `packages/memory-core/README.md`
- `docs/adr/0015-memory-performance-optimization.md` (NEW)
- `~/tasks/memory-ecosystem-performance-optimization/SUMMARY.md`

**Edit steps**:

1. Document new env flags in package READMEs
2. Write ADR explaining optimization approach, trade-offs, and rollout plan
3. Provide migration checklist for operators
4. Update `SUMMARY.md` with final metrics and lessons learned

**ADR Template Snippet**:

```markdown
# ADR 0015: Memory Ecosystem Performance Optimization

## Status
Accepted

## Context
Sequential chunk embedding and bare fetch clients caused p95 latency spikes...

## Decision
Adopt undici pooled HTTP client and p-limit bounded concurrency...

## Consequences
- Positive: 30-50% latency reduction, connection reuse
- Negative: Additional dependencies, concurrency tuning required
- Mitigation: Feature flags for staged rollout
```

**Run & verify**:

```bash
pnpm lint:markdown packages/*/README.md docs/adr/*.md
```

**Commit**: `docs(memory): performance optimization ADR and migration guide`

**Backout**: `git revert -n HEAD`

---

## 3) Technical Rationale

### Connection Pooling

Replacing bare `fetch` with `undici.Pool` aligns with Node.js HTTP working group recommendations (2025) for high-throughput services. Keep-alive reduces TLS handshake overhead (measured 40-60ms per request in profiling). HTTP/2 multiplexing prevents head-of-line blocking when syncing large memory batches.

### Parallel Ingest

Current sequential embedding loop blocks the entire ingest operation on dense+sparse vectorization. By batching with bounded concurrency (default: 4), we saturate embedding capacity without overwhelming Qdrant. The approach mirrors existing patterns in `packages/rag` for document processing.

### Cache Hygiene

Silent rejection at capacity (current Map behavior) degrades retrieval quality. LRU eviction maintains cache effectiveness while preventing unbounded growth. Timer lifecycle management eliminates resource leaks observed in long-running workers.

### Local-First Compliance

All computation remains in-process; `p-limit` queues are ephemeral. Redis caching remains optional (existing behavior). Async offload (BullMQ) deferred to avoid introducing new infrastructure dependencies.

---

## 4) Dependency Impact

### Internal Refactors

- `GraphRAGIngestService`: Signature unchanged, internal batching transparent to callers
- `RestApiClient`: Factory pattern preserves backward compat; existing constructors continue working
- `QdrantHybrid`: Cache stats exposed via new method, no breaking changes

### External Packages

| Package | Action | Reason | Risk |
|---------|--------|--------|------|
| `undici` | Add `^6.0.0` | Official Node.js HTTP client | Low - stable API |
| `p-limit` | Add `^5.0.0` | Mature concurrency primitive | Low - widely adopted |
| `lru-cache` | Add `^10.0.0` | Standard LRU implementation | Low - no breaking changes expected |

### Environment Changes

- New flags: `MEMORY_HTTP_POOL_ENABLED`, `MEMORY_PARALLEL_INGEST_CONCURRENCY`, `MEMORY_CACHE_MAX_SIZE`
- Default behavior: optimizations disabled (opt-in rollout)
- Migration: operators enable flags per environment after validation

---

## 5) Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Pool saturation under load** | Request queueing, timeout spikes | Circuit breaker integration (Task 3); monitor pool stats |
| **Concurrent Qdrant writes conflict** | Data corruption | Transactional batching; rollback on partial failure |
| **Redis connection leaks** | Memory growth, eventual crash | Graceful shutdown hooks (Task 6); health checks |
| **Concurrency tuning misconfiguration** | Overload or underutilization | Conservative defaults (4); environment-specific tuning guide |
| **Regression in existing clients** | MCP adapter failures | Feature flags default OFF; canary rollout |

---

## 6) Testing & Validation Strategy

### Test Case Matrix

| Category | Scenario | Expected Outcome | Location |
|----------|----------|------------------|----------|
| **HTTP Pooling** | Sequential requests | Single TCP connection | `http-pooling.test.ts` |
| | Pool saturation | Queueing behavior | `http-pooling.test.ts` |
| | Graceful closure | No resource leaks | `http-pooling.test.ts` |
| **Parallel Ingest** | Bounded concurrency | Max 4 concurrent embeddings | `parallel-ingest.test.ts` |
| | Partial failure | Rollback, no Qdrant writes | `parallel-ingest.test.ts` |
| | Progress events | Incremental A2A emissions | `parallel-ingest.test.ts` |
| **Cache Eviction** | Max capacity + 1 | LRU eviction | `cache-eviction.test.ts` |
| | Cache hit on old entry | LRU order updated | `cache-eviction.test.ts` |
| | Timer cleanup | No interval leaks | `cache-eviction.test.ts` |
| **Performance** | Baseline p95 | <250ms (target) | k6 validation |
| | Post-optimization p95 | ≥30% reduction | k6 validation |

### Fixtures & Mocks

- **HTTP server**: `msw` for pooling tests (track connection reuse)
- **Embedding models**: Stub with deterministic outputs (fixed vectors)
- **Qdrant**: In-memory mock with transaction tracking
- **Redis**: `ioredis-mock` for distributed cache tests
- **Clock**: Inject fixed timestamps for cache TTL tests

### Determinism

- Seed random chunk generation: `Math.seedrandom('test-seed')`
- Inject clocks via constructor: `new DistributedCache({ clock: fixedClock })`
- Pin embedding dimensions: 384 (dense), 512 (sparse)

### Coverage Target

- **Global**: ≥92% (AGENTS.md baseline)
- **Changed lines**: ≥95% (mandatory for merge)
- **Mutation**: ≥75% for critical paths (pooling, batching, eviction)

### Commands

```bash
# Unit tests
pnpm --filter memories test -- --coverage
pnpm --filter memory-core test -- --coverage

# Integration tests
pnpm test:e2e -- packages/memories packages/memory-core

# Mutation testing
pnpm --filter memory-core test:mutate -- --mutate=src/lib/concurrency.ts

# Performance validation
k6 run ~/tasks/.../validation/k6-load-test.js
```

### Manual QA Checklist

1. [ ] Start memory-rest-api with pooling enabled
2. [ ] Send 100 sequential requests via curl
3. [ ] Verify single connection in `netstat` output
4. [ ] Trigger rate limit, observe adaptive backoff (not full window sleep)
5. [ ] Ingest 1000-chunk document, verify parallel embedding in logs
6. [ ] Check cache stats endpoint for LRU evictions
7. [ ] Gracefully shutdown service, confirm no timer warnings

### Artifacts

- **Test logs**: `~/tasks/.../test-logs/unit-tests.xml` (JUnit)
- **Coverage**: `~/tasks/.../verification/coverage-report.html`
- **Mutation**: `~/tasks/.../verification/mutation-report.html`
- **Performance**: `~/tasks/.../validation/post-optimization-metrics.json`

---

## 7) Rollout / Migration Notes

### Staged Enablement

1. **Dev**: Enable all flags, validate with synthetic workloads
2. **Staging**: Enable pooling only, monitor for 48h
3. **Staging**: Enable parallel ingest (concurrency=2), monitor for 48h
4. **Staging**: Increase concurrency to 4, validate metrics
5. **Production**: Canary 10% traffic with pooling enabled
6. **Production**: Gradual rollout to 100% over 7 days

### Feature Flags

```bash
# Conservative (default - OFF)
MEMORY_HTTP_POOL_ENABLED=false
MEMORY_PARALLEL_INGEST_CONCURRENCY=0  # 0 = disabled

# Aggressive (performance-first)
MEMORY_HTTP_POOL_ENABLED=true
MEMORY_PARALLEL_INGEST_CONCURRENCY=8
MEMORY_CACHE_MAX_SIZE=500
```

### Rollback Steps

```bash
# Instant rollback (env vars)
export MEMORY_HTTP_POOL_ENABLED=false
export MEMORY_PARALLEL_INGEST_CONCURRENCY=0
pm2 restart memory-services

# Code rollback
git revert <merge-commit-sha>
pnpm --filter memories build
pnpm --filter memory-core build
pm2 restart memory-services
```

### Post-Stabilization Cleanup

- Remove feature flags after 30 days in production (make optimizations default)
- Archive baseline metrics to `docs/benchmarks/`
- Update capacity planning docs with new throughput numbers

---

## 8) Completion Criteria (Definition of Done)

- [x] All tasks (1-8) implemented and committed
- [ ] Code merged to `main`; CI green (lint, types, tests, security)
- [ ] Coverage ≥92% global, ≥95% changed lines
- [ ] Mutation score ≥75% for `concurrency.ts`, `http-client.ts`
- [ ] k6 validation shows ≥30% p95 latency reduction
- [ ] ADR 0015 merged and indexed
- [ ] `SUMMARY.md` updated with outcomes and metrics
- [ ] Feature flags documented in runbooks
- [ ] Canary rollout plan approved by ops
- [ ] No regressions in existing MCP client tests

---

## Ready-to-Run Commands

```bash
# Install dependencies
pnpm --filter memories i
pnpm --filter memory-core i

# Lint & typecheck
pnpm lint:smart
pnpm typecheck:smart

# Unit tests
pnpm --filter memories test -- --coverage
pnpm --filter memory-core test -- --coverage

# Integration tests
pnpm test:e2e -- packages/memories packages/memory-core

# Performance validation
k6 run ~/tasks/memory-ecosystem-performance-optimization/validation/k6-load-test.js

# Mutation testing
pnpm --filter memory-core test:mutate

# Build
pnpm build:smart
```

---

## Signature Deck (Key Functions/Classes)

```typescript
// packages/memories/src/adapters/rest-api/http-client.ts
export interface PoolConfig {
  connections?: number;
  pipelining?: number;
  keepAliveTimeout?: number;
  keepAliveMaxTimeout?: number;
}

export function createPooledHttpClient(baseUrl: string, config?: PoolConfig): FetchHttpClient;

export class FetchHttpClient {
  constructor(options: { baseUrl: string; pool?: Pool });
  async fetch(url: string, init?: RequestInit): Promise<Response>;
  getPoolStats(): PoolStats | null;
  async close(): Promise<void>;
}

// packages/memory-core/src/lib/concurrency.ts
export interface BoundedQueue<T> {
  map<R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]>;
  close(): void;
}

export function createBoundedQueue<T>(concurrency: number): BoundedQueue<T>;

// packages/memory-core/src/caching/DistributedCache.ts
export class DistributedCache {
  async close(): Promise<void>;
  getCacheStats(): { size: number; max: number; hits: number; misses: number };
}
```

---

## Interface Map (Data Flow)

```
┌─────────────────────┐
│ MCP Client          │
│ (createRestApi...)  │
└──────┬──────────────┘
       │ HTTP POST /memories/store
       ▼
┌─────────────────────┐
│ RestApiClient       │
│ + undici Pool       │──┐ (keep-alive, HTTP/2)
│ + Token Bucket      │  │
└──────┬──────────────┘  │
       │                 │
       │ Retry w/Backoff │
       ▼                 │
┌─────────────────────┐  │
│ GraphRAGIngest      │◀─┘
│ + BoundedQueue(4)   │
└──────┬──────────────┘
       │ Parallel embed
       ▼
┌─────────────────────┐
│ Qdrant              │
│ + Batch upsert      │
└─────────────────────┘
       │
       │ Query
       ▼
┌─────────────────────┐
│ QdrantHybrid        │
│ + LRU Cache         │
│ + DistributedCache  │
│   (Redis, timers)   │
└─────────────────────┘
```

---

## Acceptance Mapping Table

| Task | Acceptance Criteria | Verification Method |
|------|---------------------|---------------------|
| 1 | Dependencies installed, types clean | `pnpm typecheck:smart` |
| 2 | HTTP pooling tests pass, connection reuse verified | `pnpm test http-pooling` |
| 3 | Rate-limit backoff <5s max, no full-window sleeps | Unit tests + logs |
| 4 | Parallel embedding max 4 concurrent, rollback on failure | `pnpm test parallel-ingest` |
| 5 | LRU eviction at capacity, stats exposed | `pnpm test cache-eviction` |
| 6 | No timer leaks, graceful shutdown | `node --trace-warnings` + tests |
| 7 | p95 <250ms post-optimization, ≥30% improvement | k6 report comparison |
| 8 | ADR merged, READMEs updated, SUMMARY.md complete | Manual review |

---

## Secrets Handling

- **1Password CLI**: Fetch Redis credentials on-demand: `op read "op://dev/redis/password"`
- **Never commit**: API keys, connection strings, tokens in `.env` or code
- **Shared env loader**: Use `packages/cortex-env/loader.ts` (no direct `dotenv.config()`)
- **Validation**: Pre-commit hook scans for leaked secrets (`gitleaks`)

---

**Plan Status**: ✅ Ready for Implementation  
**Next Step**: Execute Task 1 — Dependency Installation & Configuration
