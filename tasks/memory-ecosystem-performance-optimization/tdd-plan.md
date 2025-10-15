# TDD Plan: Memory Ecosystem Performance Optimization

**Task ID**: `memory-ecosystem-performance-optimization`  
**Created**: 2025-10-15  
**Test Framework**: Vitest  
**Coverage Target**: ≥95% changed lines  
**Mutation Target**: ≥75% critical paths

---

## Test-Driven Development Strategy

This plan enforces **Red-Green-Refactor** cycles for all implementation tasks:

1. **Red**: Write failing test with clear expectations
2. **Green**: Implement minimal code to pass
3. **Refactor**: Improve design while keeping tests green
4. **Commit**: Small, atomic commits per cycle

---

## Test Case Matrix

### 1. HTTP Pooling (`packages/memories/__tests__/http-pooling.test.ts`)

| Test Case | Input | Expected Output | Edge Cases |
|-----------|-------|----------------|------------|
| **Connection Reuse** | 10 sequential GET requests | Single TCP connection maintained | Pool closure mid-request |
| **Pool Saturation** | 15 concurrent requests (pool=10) | 10 immediate, 5 queued | Timeout during queue wait |
| **Keep-Alive Timeout** | Request after 5s idle (timeout=4s) | New connection established | Verify old connection closed |
| **Graceful Closure** | `client.close()` with pending requests | Wait for completion, then close | Force close on timeout |
| **HTTP/2 Multiplexing** | 5 concurrent requests to HTTP/2 server | Single connection, multiplexed streams | Fallback to HTTP/1.1 |
| **Pool Stats** | After 100 requests | Stats: `{ connected: 1, pending: 0, running: 0 }` | Stats after closure |
| **Error Propagation** | Pool closed, attempt request | Throws `PoolClosedError` | Multiple close() calls |

#### Fixtures

```typescript
// HTTP server mock (msw)
const server = setupServer(
  rest.get('http://localhost:3000/test', (req, res, ctx) => {
    return res(ctx.json({ ok: true }));
  })
);

// Track connection count
let connectionCount = 0;
server.events.on('request:start', () => connectionCount++);
```

#### Determinism

- Fixed server response time: 50ms
- Predictable pool configuration: `{ connections: 10, keepAliveTimeout: 4000 }`
- No random delays; use fixed sleep intervals

---

### 2. Adaptive Rate-Limit Backoff (`packages/memories/__tests__/rate-limit-backoff.test.ts`)

| Test Case | Input | Expected Output | Edge Cases |
|-----------|-------|----------------|------------|
| **Token Bucket Consumption** | 5 requests, capacity=3, refill=1/s | First 3 immediate, next 2 delayed | Zero capacity |
| **Exponential Backoff** | 3 retry attempts | Delays: 100ms, 200ms, 400ms | Max delay cap (5000ms) |
| **Rate Limit Header Parsing** | `X-RateLimit-Reset: 1697500000` | Bucket refill scheduled at timestamp | Invalid header format |
| **Circuit Breaker Open** | 5 consecutive 429s | Breaker opens, fail fast | Breaker half-open recovery |
| **Adaptive Window** | Rate limit resets mid-retry | Resume immediately, no full-window wait | Clock skew handling |

#### Fixtures

```typescript
// Mock rate-limited API
let requestCount = 0;
server.use(
  rest.post('http://localhost:3000/api', (req, res, ctx) => {
    if (++requestCount > 3) {
      return res(ctx.status(429), ctx.set('X-RateLimit-Reset', '1697500010'));
    }
    return res(ctx.json({ ok: true }));
  })
);

// Fixed clock for deterministic backoff
const clock = { now: () => 1697500000000 };
```

#### Determinism

- Inject clock: `new TokenBucket({ capacity: 3, refillRate: 1, clock })`
- Fixed retry delays (no jitter in tests)
- Predictable rate limit reset timestamps

---

### 3. Parallel Chunk Embedding (`packages/memory-core/__tests__/parallel-ingest.test.ts`)

| Test Case | Input | Expected Output | Edge Cases |
|-----------|-------|----------------|------------|
| **Bounded Concurrency** | 10 chunks, concurrency=4 | Max 4 concurrent embeddings | Zero concurrency (fallback) |
| **Batch Completion** | 8 chunks (2 batches of 4) | All embeddings complete, Qdrant batch write | Odd chunk count (partial batch) |
| **Partial Failure** | Chunk 5 embed fails | Rollback, no Qdrant writes, error propagated | First chunk fails |
| **Progress Events** | 12 chunks, concurrency=4 | 3 A2A events (per batch of 4) | Single chunk (1 event) |
| **Transactional Write** | 100 chunks succeed | Single Qdrant `upsertBatch` call | Qdrant write fails (full rollback) |
| **Idempotency** | Re-ingest same document | Old chunks removed, new chunks inserted | Concurrent re-ingests |

#### Fixtures

```typescript
// Mock embedder tracking concurrency
let activeCalls = 0;
let maxConcurrency = 0;

const mockEmbedder = {
  async embed(text: string): Promise<number[]> {
    activeCalls++;
    maxConcurrency = Math.max(maxConcurrency, activeCalls);
    await sleep(10); // Simulate embedding latency
    activeCalls--;
    return Array(384).fill(0.1); // Fixed dense vector
  },
};

// Deterministic chunk generation
function generateChunks(count: number): Chunk[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `chunk-${i}`,
    text: `Content ${i}`,
  }));
}
```

#### Determinism

- Fixed embedding dimension: 384 (dense), 512 (sparse)
- Predictable chunk IDs: `chunk-0`, `chunk-1`, ...
- Controlled async timing: `sleep(10)` instead of real model latency
- Seed random text if needed: `Math.seedrandom('test-seed')`

---

### 4. LRU Cache Eviction (`packages/memory-core/__tests__/cache-eviction.test.ts`)

| Test Case | Input | Expected Output | Edge Cases |
|-----------|-------|----------------|------------|
| **Max Capacity** | Insert 101 items (max=100) | First item evicted, size=100 | Max=1 (single entry) |
| **LRU Order** | Access item 0, insert 101st item | Item 1 evicted (item 0 promoted) | Access during eviction |
| **Cache Hit** | Query cached item | Hit counter incremented | Concurrent hits |
| **Cache Miss** | Query new item | Miss counter incremented, item cached | Cache full (evict before insert) |
| **Eviction Callback** | Evict item | Log entry emitted | Callback throws error |
| **Stats Accuracy** | 50 hits, 30 misses, 10 evictions | `getCacheStats()` returns accurate counts | Stats after cache clear |

#### Fixtures

```typescript
// Mock Qdrant client
const mockQdrant = {
  async search(query: string): Promise<QueryResult> {
    return { id: query, score: 0.9, metadata: {} };
  },
};

// Deterministic cache entries
function createCacheEntry(key: string): QueryResult {
  return { id: key, score: 0.9, metadata: { source: 'test' } };
}
```

#### Determinism

- Fixed max size: 100
- Predictable keys: `query-0`, `query-1`, ...
- No TTL-based eviction in tests (time-independent)

---

### 5. Distributed Cache Timer Lifecycle (`packages/memory-core/__tests__/cache-timer-lifecycle.test.ts`)

| Test Case | Input | Expected Output | Edge Cases |
|-----------|-------|----------------|------------|
| **Interval Creation** | `new DistributedCache({ metricsEnabled: true })` | Interval handle stored | Metrics disabled |
| **Timer Cleanup** | `cache.close()` | Interval cleared, no warnings | Close before interval fires |
| **Graceful Shutdown** | `process.emit('beforeExit')` | Cache closed, Redis connection terminated | Multiple beforeExit calls |
| **Auto-Cleanup Flag** | `autoCleanup: false` | No shutdown hook registered | Multiple cache instances |
| **Branded Logs** | `cache.close()` | Log: `{ brand: "brAInwav", msg: "cache shutdown complete" }` | Log redaction |

#### Fixtures

```typescript
// Mock Redis client
const mockRedis = {
  async quit() { /* noop */ },
};

// Mock logger capturing logs
const logs: any[] = [];
const mockLogger = {
  info: (entry: any) => logs.push(entry),
  debug: (entry: any) => logs.push(entry),
};

// Fixed clock for interval testing
let ticks = 0;
const clock = { now: () => ticks * 60_000 }; // 1-minute intervals
```

#### Determinism

- Inject clock: `new DistributedCache({ clock })`
- Mock `setInterval`/`clearInterval` for controllable ticks
- Verify interval handle via private field inspection: `cache['metricsInterval']`

---

## Mocking Strategy

### HTTP Requests

- **Library**: `msw` (Mock Service Worker)
- **Scope**: Network requests in `http-pooling.test.ts`, `rate-limit-backoff.test.ts`
- **Rationale**: Deterministic HTTP responses, connection tracking

### Embeddings

- **Strategy**: Stub with fixed-dimension vectors
- **Avoid**: Over-mocking core logic (test real batching, not mocked promises)
- **Example**:

  ```typescript
  const mockEmbedder = {
    embed: vi.fn(async (text) => Array(384).fill(0.1)),
  };
  ```

### Qdrant

- **Strategy**: In-memory mock with transaction tracking
- **Methods**: `upsertBatch`, `search`, `delete`
- **Validation**: Verify batch size, rollback on error

### Redis

- **Library**: `ioredis-mock`
- **Scope**: Distributed cache tests
- **Validation**: TTL enforcement, key expiration

---

## Property-Based Testing (Optional)

For critical paths, consider property tests with `fast-check`:

```typescript
import { fc, test } from '@fast-check/vitest';

test.prop([fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 1, maxLength: 100 })])(
  'parallel ingest preserves all chunks',
  async (chunkCounts) => {
    const totalChunks = chunkCounts.reduce((a, b) => a + b, 0);
    // Property: upsertBatch called with exactly totalChunks items
  }
);
```

**Use cases**:

- Cache eviction invariants (size never exceeds max)
- Concurrency limits (active tasks ≤ concurrency)
- Retry backoff bounds (delay ≤ maxDelay)

---

## Coverage Measurement

### Tools

- **Vitest**: Built-in coverage via `c8`
- **Istanbul**: HTML reports in `coverage/` directory
- **Stryker**: Mutation testing for `concurrency.ts`, `http-client.ts`

### Commands

```bash
# Unit coverage
pnpm --filter memories test -- --coverage
pnpm --filter memory-core test -- --coverage

# Mutation testing
pnpm --filter memory-core test:mutate -- --mutate=src/lib/concurrency.ts

# Coverage report
open packages/memory-core/coverage/index.html
```

### Thresholds

```json
{
  "coverageThreshold": {
    "global": {
      "statements": 92,
      "branches": 92,
      "functions": 92,
      "lines": 95
    },
    "src/lib/concurrency.ts": {
      "statements": 100,
      "branches": 100,
      "functions": 100,
      "lines": 100
    }
  }
}
```

---

## Test Execution Order

### Phase 1: Isolated Unit Tests

1. `http-pooling.test.ts` (no external deps)
2. `rate-limit-backoff.test.ts` (no external deps)
3. `cache-eviction.test.ts` (in-memory cache)
4. `cache-timer-lifecycle.test.ts` (mocked timers)

### Phase 2: Integration Tests

5. `parallel-ingest.test.ts` (mock Qdrant + embedders)
6. End-to-end REST → GraphRAG → Qdrant flow

### Phase 3: Performance Tests

7. k6 load tests (requires running services)
8. Memory profiling (`scripts/sample-memory.mjs`)

---

## Test Data Builders

```typescript
// packages/memory-core/__tests__/fixtures/builders.ts

export function buildChunk(overrides?: Partial<Chunk>): Chunk {
  return {
    id: `chunk-${Math.random().toString(36).slice(2)}`,
    text: 'Sample chunk content',
    metadata: {},
    ...overrides,
  };
}

export function buildDocument(chunkCount: number): Document {
  return {
    id: `doc-${Date.now()}`,
    chunks: Array.from({ length: chunkCount }, (_, i) => buildChunk({ id: `chunk-${i}` })),
  };
}

export function buildEmbedding(dimension: number): number[] {
  return Array(dimension).fill(0).map(() => Math.random());
}
```

---

## Continuous Testing (Watch Mode)

```bash
# Dev workflow
pnpm --filter memory-core test -- --watch

# TDD Coach (pre-commit validation)
pnpm tdd-coach:watch src/lib/concurrency.ts

# CI integration
pnpm test:smart -- --coverage --reporter=junit --outputFile=test-results.xml
```

---

## Mutation Testing Configuration

```javascript
// stryker.conf.js (memory-core)
module.exports = {
  mutate: ['src/lib/concurrency.ts', 'src/lib/batch-processor.ts'],
  testRunner: 'vitest',
  coverageAnalysis: 'perTest',
  thresholds: { high: 80, low: 60, break: 75 },
  mutators: ['ArithmeticOperator', 'BlockStatement', 'ConditionalExpression'],
};
```

**Critical paths for mutation**:

- `createBoundedQueue` (concurrency limit enforcement)
- `TokenBucket.tryConsume()` (rate limit logic)
- LRU eviction logic (cache size invariants)

---

## Test Artifacts (Output)

### Locations

- **JUnit XML**: `~/tasks/.../test-logs/unit-tests.xml`
- **Coverage HTML**: `~/tasks/.../verification/coverage-report.html`
- **Mutation Report**: `~/tasks/.../verification/mutation-report.html`
- **k6 Metrics**: `~/tasks/.../validation/post-optimization-metrics.json`

### CI Integration

```yaml
# .github/workflows/test.yml (excerpt)
- name: Run Tests
  run: pnpm test:smart -- --coverage --reporter=junit
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
- name: Mutation Testing
  run: pnpm --filter memory-core test:mutate
```

---

## Manual Testing Scenarios

### Scenario 1: HTTP Pool Connection Reuse

1. Start memory-rest-api: `pnpm --filter memory-rest-api dev`
2. Enable pooling: `export MEMORY_HTTP_POOL_ENABLED=true`
3. Send 100 requests: `seq 100 | xargs -I{} curl http://localhost:3000/health`
4. Check connections: `netstat -an | grep :3000 | grep ESTABLISHED | wc -l`
5. **Expected**: 1 connection (not 100)

### Scenario 2: Parallel Ingest Concurrency

1. Enable parallel ingest: `export MEMORY_PARALLEL_INGEST_CONCURRENCY=4`
2. Tail logs: `tail -f logs/memory-core.log | grep "embedding chunk"`
3. Ingest large document (1000 chunks): `curl -X POST .../memories/store -d @large-doc.json`
4. **Expected**: Log timestamps show max 4 concurrent embeddings

### Scenario 3: Cache Eviction

1. Set small cache: `export MEMORY_CACHE_MAX_SIZE=10`
2. Query 20 unique items: `seq 20 | xargs -I{} curl ".../query?q=item-{}"`
3. Check stats: `curl http://localhost:3000/cache/stats`
4. **Expected**: `{ size: 10, evictions: 10 }`

---

## TDD Workflow Example (Task 4)

### Red Phase

```typescript
// parallel-ingest.test.ts
it('should batch embed with concurrency=4', async () => {
  const chunks = generateChunks(10);
  const service = new GraphRAGIngestService({ concurrency: 4 });
  
  await service.ingestDocument({ id: 'test', chunks });
  
  expect(maxConcurrency).toBe(4); // FAILS - not implemented yet
});
```

### Green Phase

```typescript
// GraphRAGIngestService.ts (minimal implementation)
async ingestDocument(doc: Document): Promise<void> {
  const queue = createBoundedQueue(this.concurrency);
  await queue.map(doc.chunks, chunk => this.embed(chunk));
}
```

### Refactor Phase

- Extract `embed` helper
- Add error aggregation
- Improve logging

### Commit

```bash
git add .
git commit -m "feat(memory-core): parallel chunk embedding (Task 4)"
```

---

## Test Maintenance

### When Tests Fail

1. **Isolate**: Run single test with `it.only`
2. **Debug**: Add `console.log` or use Vitest debugger
3. **Verify**: Check fixture data, mock behavior
4. **Fix**: Update implementation or test expectations

### Flaky Test Prevention

- Avoid real timers: use `vi.useFakeTimers()`
- No network calls: mock with `msw`
- Seed randomness: `Math.seedrandom('fixed-seed')`
- Fixed clocks: inject `{ now: () => 1697500000000 }`

### Test Refactoring

- Extract common fixtures to `__tests__/fixtures/`
- Share builders across test files
- DRY test setup: use `beforeEach` for common initialization

---

## Acceptance Criteria ↔ Test Mapping

| Task | Acceptance Criteria | Test File | Test Case |
|------|---------------------|-----------|-----------|
| 2 | Connection reuse verified | `http-pooling.test.ts` | "should reuse connections" |
| 2 | Pool stats exposed | `http-pooling.test.ts` | "should return pool stats" |
| 3 | Adaptive backoff <5s | `rate-limit-backoff.test.ts` | "should cap at maxDelay" |
| 4 | Max 4 concurrent embeddings | `parallel-ingest.test.ts` | "bounded concurrency" |
| 4 | Rollback on failure | `parallel-ingest.test.ts` | "partial failure rollback" |
| 5 | LRU eviction at capacity | `cache-eviction.test.ts` | "max capacity eviction" |
| 6 | No timer leaks | `cache-timer-lifecycle.test.ts` | "cleanup timers on close" |
| 7 | p95 <250ms | k6 validation | Performance threshold |

---

**TDD Plan Status**: ✅ Complete  
**Next Step**: Begin Red-Green-Refactor cycles starting with Task 2
