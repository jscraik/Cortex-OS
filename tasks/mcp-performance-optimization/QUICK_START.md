# Quick Start Guide: MCP Performance Optimization Implementation

**Task ID**: `mcp-performance-optimization`  
**Created**: 2025-10-15

---

## Prerequisites

- Node.js 22+ installed
- pnpm workspace initialized
- Access to `/Users/jamiecraik/.Cortex-OS` repository
- Permissions to install npm packages

---

## Step 1: Install Dependencies

```bash
cd /Users/jamiecraik/.Cortex-OS

# Install undici and p-limit
cd packages/mcp
pnpm add undici@^6.19.0 p-limit@^5.0.0

# Verify installation
pnpm list undici p-limit

# Return to workspace root
cd ../..
```

**Expected Output**:

```
undici 6.19.0
p-limit 5.0.0
```

---

## Step 2: Run Tests Before Changes (Baseline)

```bash
# Test MCP package (baseline)
pnpm --filter @cortex-os/mcp test

# Test Registry package (baseline)
pnpm --filter @cortex-os/mcp-registry test

# Capture baseline coverage
pnpm --filter @cortex-os/mcp test:coverage
pnpm --filter @cortex-os/mcp-registry test:coverage
```

**Expected Output**: All existing tests pass (if any)

---

## Step 3: TDD Cycle 1 - RefreshScheduler

### 3.1 Write Failing Tests

```bash
# Create test file
cat > /Users/jamiecraik/.Cortex-OS/packages/mcp/src/connectors/__tests__/refresh-scheduler.test.ts << 'EOF'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RefreshScheduler } from '../refresh-scheduler.js';

describe('RefreshScheduler', () => {
 beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2025-10-15T00:00:00.000Z') });
 });

 afterEach(() => {
  vi.useRealTimers();
 });

 it('schedules refresh with jitter', async () => {
  const onRefresh = vi.fn().mockResolvedValue(undefined);
  const logger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn() };
  const scheduler = new RefreshScheduler({
   intervalMs: 1000,
   jitterFactor: 0.2,
   onRefresh,
   logger: logger as any,
  });

  scheduler.start();
  await vi.advanceTimersByTimeAsync(1200);
  expect(onRefresh).toHaveBeenCalledTimes(1);
  scheduler.stop();
 });

 it('handles refresh errors gracefully', async () => {
  const onRefresh = vi.fn().mockRejectedValue(new Error('fail'));
  const logger = { warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
  const scheduler = new RefreshScheduler({
   intervalMs: 1000,
   onRefresh,
   logger: logger as any,
  });

  scheduler.start();
  await vi.advanceTimersByTimeAsync(1200);
  expect(logger.warn).toHaveBeenCalledWith(
   expect.objectContaining({ error: 'fail' }),
   'Refresh failed'
  );
  scheduler.stop();
 });
});
EOF

# Run tests (should FAIL - Red phase)
pnpm --filter @cortex-os/mcp test -- refresh-scheduler
```

**Expected Output**: Tests fail with "Cannot find module '../refresh-scheduler.js'"

### 3.2 Implement RefreshScheduler (Green Phase)

```bash
# Create implementation file
cat > /Users/jamiecraik/.Cortex-OS/packages/mcp/src/connectors/refresh-scheduler.ts << 'EOF'
import type { Logger } from 'pino';

export interface RefreshSchedulerOptions {
 intervalMs: number;
 jitterFactor?: number;
 onRefresh: () => Promise<void>;
 logger: Logger;
}

export class RefreshScheduler {
 private timer: NodeJS.Timeout | null = null;
 private running = false;

 constructor(private readonly options: RefreshSchedulerOptions) {}

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
  const delay = Math.floor(
   this.options.intervalMs * (1 + (Math.random() * 2 - 1) * jitter)
  );
  this.timer = setTimeout(() => this.executeRefresh(), delay);
 }

 private async executeRefresh(): Promise<void> {
  try {
   await this.options.onRefresh();
  } catch (error) {
   this.options.logger.warn(
    { error: (error as Error).message },
    'Refresh failed'
   );
  } finally {
   this.scheduleNext();
  }
 }
}
EOF

# Run tests (should PASS - Green phase)
pnpm --filter @cortex-os/mcp test -- refresh-scheduler
```

**Expected Output**: All tests pass ✅

---

## Step 4: TDD Cycle 2 - ManifestCache

### 4.1 Write Failing Tests

```bash
cat > /Users/jamiecraik/.Cortex-OS/packages/mcp/src/connectors/__tests__/cache.test.ts << 'EOF'
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ManifestCache } from '../cache.js';

describe('ManifestCache', () => {
 beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2025-10-15T00:00:00.000Z') });
 });

 afterEach(() => {
  vi.useRealTimers();
 });

 it('returns fresh value before TTL expiry', () => {
  const cache = new ManifestCache<string>();
  cache.set('test-value', 5000);
  
  vi.advanceTimersByTime(2000);
  expect(cache.get()).toBe('test-value');
 });

 it('returns stale value after expiry', () => {
  const cache = new ManifestCache<string>();
  cache.set('value1', 1000);
  
  vi.advanceTimersByTime(2000);
  cache.set('value2', 1000);
  
  vi.advanceTimersByTime(2000);
  const result = cache.get();
  expect(result).toBe('value1'); // stale from first set
 });

 it('invalidate clears cache', () => {
  const cache = new ManifestCache<string>();
  cache.set('test', 10000);
  cache.invalidate();
  expect(cache.get()).toBeUndefined();
 });
});
EOF

pnpm --filter @cortex-os/mcp test -- cache
```

**Expected Output**: Tests fail (Red phase)

### 4.2 Implement ManifestCache (Green Phase)

```bash
cat > /Users/jamiecraik/.Cortex-OS/packages/mcp/src/connectors/cache.ts << 'EOF'
export interface CachedValue<T> {
 value: T;
 expiresAt: number;
 stale?: T;
}

export class ManifestCache<T> {
 private cache: CachedValue<T> | null = null;

 get(): T | undefined {
  if (!this.cache) return undefined;
  const now = Date.now();
  if (now < this.cache.expiresAt) return this.cache.value;
  return this.cache.stale;
 }

 set(value: T, ttlMs: number): void {
  const now = Date.now();
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
EOF

pnpm --filter @cortex-os/mcp test -- cache
```

**Expected Output**: All tests pass ✅

---

## Step 5: Run Full Test Suite

```bash
# Run all MCP tests
pnpm --filter @cortex-os/mcp test

# Run with coverage
pnpm --filter @cortex-os/mcp test:coverage

# Check coverage percentage
cat packages/mcp/coverage/coverage-summary.json | grep -A 3 '"total"'
```

**Expected Output**: Coverage ≥80% for new modules

---

## Step 6: Typecheck & Lint

```bash
# Typecheck
pnpm --filter @cortex-os/mcp typecheck
pnpm --filter @cortex-os/mcp-registry typecheck

# Lint
pnpm --filter @cortex-os/mcp lint
pnpm --filter @cortex-os/mcp-registry lint
```

**Expected Output**: No errors

---

## Step 7: Commit Progress

```bash
cd /Users/jamiecraik/.Cortex-OS

# Stage changes
git add packages/mcp/package.json
git add packages/mcp/src/connectors/refresh-scheduler.ts
git add packages/mcp/src/connectors/cache.ts
git add packages/mcp/src/connectors/__tests__/

# Commit with Conventional Commits format
git commit -m "feat(mcp): add refresh scheduler and manifest cache

- Implement RefreshScheduler with jitter and error handling
- Implement ManifestCache with stale-on-error semantics
- Add comprehensive unit tests with fake timers
- Coverage: 100% for new modules"
```

---

## Step 8: Continue TDD Cycles

Follow the same Red-Green-Refactor pattern for remaining tasks:

1. **Service Map Enhancement**: Update `service-map.ts` to use shared agent
2. **Manager Parallelization**: Refactor `manager.ts` with `Promise.allSettled` + `p-limit`
3. **Registry Memory Cache**: Implement `memory-cache.ts` and integrate into `fs-store.ts`

---

## Step 9: Performance Benchmarking

```bash
# Create benchmark test
mkdir -p packages/mcp/src/connectors/__tests__

# Run benchmarks
pnpm --filter @cortex-os/mcp test -- benchmark.perf

# Export results
mkdir -p ~/tasks/mcp-performance-optimization/test-logs
cp packages/mcp/benchmark-results.json ~/tasks/mcp-performance-optimization/test-logs/
```

---

## Step 10: Final Verification

```bash
# Run all checks
cd /Users/jamiecraik/.Cortex-OS

# Install all dependencies
pnpm install

# Typecheck all packages
pnpm --filter @cortex-os/mcp typecheck
pnpm --filter @cortex-os/mcp-registry typecheck

# Lint all packages
pnpm --filter @cortex-os/mcp lint
pnpm --filter @cortex-os/mcp-registry lint

# Test with coverage
pnpm --filter @cortex-os/mcp test:coverage
pnpm --filter @cortex-os/mcp-registry test:coverage

# Copy coverage reports
cp -r packages/mcp/coverage/html ~/tasks/mcp-performance-optimization/verification/coverage-mcp
cp -r packages/mcp-registry/coverage/html ~/tasks/mcp-performance-optimization/verification/coverage-registry
```

**Success Criteria**:

- ✅ All tests pass
- ✅ Coverage ≥80%
- ✅ No TypeScript errors
- ✅ No lint errors
- ✅ Benchmark shows ≥35% improvement

---

## Environment Variables Setup

```bash
# Add to .env or export in shell
export MCP_CONNECTOR_REFRESH_SYNC=false  # Enable async refresh
export MCP_CONNECTOR_REFRESH_INTERVAL_MS=300000  # 5 minutes

# For testing: enable sync mode (rollback)
export MCP_CONNECTOR_REFRESH_SYNC=true
```

---

## Troubleshooting

### Issue: Tests fail with "Cannot find module"

**Solution**:

```bash
pnpm --filter @cortex-os/mcp run build
```

### Issue: Coverage below 80%

**Solution**:

```bash
# Check which lines are uncovered
open packages/mcp/coverage/html/index.html

# Add missing test cases for uncovered branches
```

### Issue: TypeScript errors in tests

**Solution**:

```bash
# Ensure test types are installed
pnpm add -D @types/node vitest

# Check tsconfig.json includes test files
cat packages/mcp/tsconfig.json | grep "include"
```

---

## Next Steps After Implementation

1. **Create Pull Request** with all commits
2. **Update SUMMARY.md** with final metrics
3. **Run manual QA checklist** from implementation plan
4. **Monitor Prometheus dashboards** post-deployment
5. **Document lessons learned**

---

## Reference Links

- **Implementation Plan**: `~/tasks/mcp-performance-optimization/implementation-plan.md`
- **TDD Plan**: `~/tasks/mcp-performance-optimization/tdd-plan.md`
- **Checklist**: `~/tasks/mcp-performance-optimization/implementation-checklist.md`
- **Architecture**: `~/tasks/mcp-performance-optimization/design/architecture-diagram.md`
- **Baton**: `~/tasks/mcp-performance-optimization/json/baton.v1.json`

---

**Quick Start Status**: ✅ Complete  
**Last Updated**: 2025-10-15
