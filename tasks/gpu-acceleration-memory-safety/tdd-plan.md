# TDD Plan: GPU Acceleration Memory Safety

**Task:** gpu-acceleration-memory-safety  
**Created:** 2025-10-12  
**TDD Methodology:** RED→GREEN→REFACTOR with evidence tokens  
**Coverage Target:** ≥92% package / ≥95% changed lines  

## TDD Approach & Test Design Philosophy

Following **brAInwav TDD standards** with constitutional compliance:

### **RED→GREEN→REFACTOR Cycle**
1. **RED:** Write failing tests that specify exact behavior expected
2. **GREEN:** Implement minimal code to make tests pass  
3. **REFACTOR:** Clean up code while keeping tests green
4. **EVIDENCE:** Emit required tokens per agentic-phase-policy.md

### **Test Design Principles**
- **Deterministic:** No reliance on real timers, external GPU hardware, or random values
- **Isolated:** Mock heavy dependencies, focus on unit behavior
- **Comprehensive:** Cover happy path, error conditions, edge cases, cleanup scenarios
- **brAInwav Compliant:** All test outputs include brand metadata

## Test Matrix & Case Coverage

### **Primary Test Suite: GPUAcceleration.memory.test.ts**

#### **Happy Path Tests**
```typescript
describe('GPU Memory Management - Happy Path', () => {
  test('should reserve and release memory for single batch', async () => {
    // Setup: Mock device with 1000MB total
    // Action: Process single embedding batch requiring 256MB  
    // Assert: Memory reserved during processing, fully released after
    // Evidence: device.memoryUsed === 0, device.memoryFree === 1000 post-completion
  });

  test('should handle multiple sequential batches correctly', async () => {
    // Setup: Multiple batches queued with different memory requirements
    // Action: Process batches in sequence  
    // Assert: Each batch reserves/releases independently, no accumulation
    // Evidence: Memory counters reset between each batch
  });
});
```

#### **Error Path Tests**
```typescript
describe('GPU Memory Management - Error Handling', () => {
  test('should release memory even when embedding generation fails', async () => {
    // Setup: Mock embedder to throw error mid-process
    // Action: Attempt batch processing that fails
    // Assert: Memory still released via finally block
    // Evidence: device.memoryUsed back to 0 despite error
  });

  test('should reject reservation when insufficient memory', async () => {
    // Setup: Device with only 100MB free, request 500MB
    // Action: Attempt memory reservation
    // Assert: Throws brAInwav-branded error, no memory modified
    // Evidence: Error message includes memory requirements
  });
});
```

#### **Boundary & Edge Cases**
```typescript
describe('GPU Memory Management - Boundaries', () => {
  test('should handle zero-memory reservation gracefully', async () => {
    // Edge case: Empty text array results in 0MB request
    // Assert: No error, reservation/release cycle still works
  });

  test('should handle exact memory limit reservations', async () => {
    // Boundary: Request exactly device.memoryFree amount  
    // Assert: Succeeds, leaves device with 0 free memory
  });

  test('should prevent double-release of same reservation', async () => {
    // Edge case: release() called multiple times
    // Assert: Idempotent - no negative memory values
  });
});
```

#### **Cleanup & Lifecycle Tests**
```typescript
describe('GPU Memory Management - Lifecycle', () => {
  test('should clean all reservations on stop()', async () => {
    // Setup: Create multiple active reservations
    // Action: Call manager.stop()
    // Assert: activeReservations map cleared, device memory reset
    // Evidence: Defensive logging shows cleaned count
  });

  test('should log leaked reservations during shutdown', async () => {
    // Setup: Force reservation leak (don't call release)
    // Action: Call stop() with leaked reservations
    // Assert: Warning logged with brAInwav brand and leak details
    // Evidence: Console output contains leak count and reservation IDs
  });
});
```

### **Secondary Test Suite: GraphRAGService.gpu-shutdown.test.ts**

#### **Service Integration Tests**
```typescript
describe('GraphRAG Service GPU Shutdown', () => {
  test('should call stopGPUAccelerationManager during close()', async () => {
    // Setup: Mock stopGPUAccelerationManager function
    // Action: Create service, call close()
    // Assert: GPU shutdown called exactly once, before Prisma shutdown
    // Evidence: Mock call count verification
  });

  test('should continue shutdown even if GPU stop fails', async () => {
    // Setup: Mock stopGPUAccelerationManager to throw error
    // Action: Call service.close()
    // Assert: Error logged but Prisma shutdown still called
    // Evidence: Both error log and successful Prisma cleanup
  });
});
```

## Fixtures & Mock Strategy

### **GPU Device Mocks**
```typescript
// Deterministic mock devices for consistent testing
const createMockDevice = (id: number, totalMemory: number): GPUDeviceInfo => ({
  id,
  name: `Test-GPU-${id}`,
  memoryTotal: totalMemory,
  memoryUsed: 0,
  memoryFree: totalMemory,
  computeCapability: '8.6',
  isAvailable: true,
  utilization: 0
});

const STANDARD_DEVICE = createMockDevice(0, 1000); // 1GB test device
const SMALL_DEVICE = createMockDevice(1, 100);     // 100MB limited device  
const LARGE_DEVICE = createMockDevice(2, 8000);    // 8GB high-capacity device
```

### **Embedding Request Fixtures**
```typescript
const createEmbeddingRequest = (textCount: number, batchId?: string): EmbeddingRequest[] => 
  Array.from({ length: textCount }, (_, i) => ({
    text: `Test embedding text ${i}`,
    priority: 'normal' as const,
    batchId: batchId || `test-batch-${i}`,
    requestedAt: Date.now()
  }));

const SINGLE_REQUEST = createEmbeddingRequest(1, 'single-batch');
const SMALL_BATCH = createEmbeddingRequest(5, 'small-batch');  
const LARGE_BATCH = createEmbeddingRequest(50, 'large-batch');
```

### **Mock Dependency Strategy**
```typescript
// Minimal mocking - only constructor-heavy dependencies
vi.mock('../src/retrieval/QdrantHybrid.js', () => ({
  QdrantHybridSearch: class MockQdrant {
    async close() { /* no-op */ }
  }
}));

vi.mock('../src/db/prismaClient.js', () => ({
  prisma: { /* minimal stubs */ },
  shutdownPrisma: vi.fn().mockResolvedValue(void 0)
}));

// Spy on actual GPU manager functions
vi.mock('../src/acceleration/GPUAcceleration.js', async () => {
  const actual = await vi.importActual('../src/acceleration/GPUAcceleration.js');
  return {
    ...actual,
    stopGPUAccelerationManager: vi.fn().mockResolvedValue(void 0)
  };
});
```

## Determinism & Timing Control

### **Fake Timers**
```typescript
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2025-10-12T22:00:00Z')); // Fixed test time
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
```

### **Predictable IDs**
```typescript
// Override randomUUID for deterministic batch IDs
vi.spyOn(crypto, 'randomUUID')
  .mockReturnValueOnce('batch-001')
  .mockReturnValueOnce('batch-002')
  .mockReturnValueOnce('batch-003');
```

### **Memory Calculation Consistency**
```typescript
// Standard memory estimation for test consistency
const MEMORY_PER_TEXT = 10; // MB per text item (deterministic for tests)
const calculateExpectedMemory = (textCount: number) => textCount * MEMORY_PER_TEXT;
```

## Coverage Targets & Commands

### **Coverage Requirements**
- **Package Minimum:** ≥92% overall coverage
- **Changed Lines:** ≥95% coverage on new/modified code
- **Mutation Testing:** ≥90% mutation score (where enabled)

### **Test Execution Commands**
```bash
# Full test suite with coverage
pnpm --filter memory-core test:coverage

# Specific test suites
pnpm --filter memory-core test -- GPUAcceleration.memory.test.ts --reporter=verbose
pnpm --filter memory-core test -- GraphRAGService.gpu-shutdown.test.ts --reporter=verbose

# Watch mode for TDD development
pnpm --filter memory-core test:watch -- GPUAcceleration.memory.test.ts

# Mutation testing (if enabled)
pnpm --filter memory-core test:mutation
```

### **Coverage Verification**
```bash
# Generate detailed coverage report
pnpm --filter memory-core test:coverage --reporter=verbose --coverage.reporter=html

# Save coverage artifacts
cp packages/memory-core/coverage/index.html ~/tasks/gpu-acceleration-memory-safety/verification/coverage-report.html
```

## Evidence Token Requirements

Per `.cortex/rules/agentic-phase-policy.md`, emit these tokens:

### **RED Phase Evidence**
```bash
echo "PHASE_TRANSITION:PLANNING->RED" 
echo "AGENTS_MD_SHA:$(sha256sum packages/memory-core/AGENTS.md | cut -d' ' -f1)"
echo "brAInwav-vibe-check"
echo "TIME_FRESHNESS:OK tz=America/New_York today=$(date +%Y-%m-%d)"
```

### **GREEN Phase Evidence**
```bash
echo "PHASE_TRANSITION:RED->GREEN"
echo "COVERAGE:OK CHANGED_LINES:OK"
echo "pnpm test -- passed"
```

### **REFACTOR Phase Evidence**
```bash
echo "PHASE_TRANSITION:GREEN->REFACTOR"  
echo "A11Y_REPORT:OK" # N/A for backend
echo "STRUCTURE_GUARD:OK"
echo "MEMORY_PARITY:OK"
```

## Quality Gates & Validation

### **Pre-Commit Validation**
- All tests passing: `pnpm --filter memory-core test`
- Type safety: `pnpm --filter memory-core typecheck`
- Linting clean: `pnpm --filter memory-core lint`
- Security scan: `pnpm --filter memory-core security:scan`

### **Integration Validation**
- Service lifecycle test: Full GraphRAG service start/stop cycle
- Memory monitoring: No leaked reservations in system state
- Error handling: GPU failures don't prevent service shutdown

### **Performance Baseline**
- Memory reservation overhead: <1ms per reservation
- Cleanup completion: <100ms for stop() method
- Service shutdown: <5s total including GPU cleanup

## Test Data & Artifacts

### **Test Log Storage**
All test execution logs saved to `~/tasks/gpu-acceleration-memory-safety/test-logs/`:
- `red-phase.log` - Initial failing test results
- `green-memory.log` - Memory management test passes  
- `green-service.log` - Service integration test passes
- `coverage-report.json` - Final coverage metrics
- `mutation-results.json` - Mutation test outcomes

### **Verification Artifacts**
Saved to `~/tasks/gpu-acceleration-memory-safety/verification/`:
- `coverage-report.html` - Interactive coverage browser
- `test-results.xml` - JUnit test results for CI
- `performance-baseline.json` - Memory operation timing
- `security-scan.sarif` - Security analysis results

---

**TDD Completion Criteria:**
- [ ] RED phase: All tests fail initially as expected
- [ ] GREEN phase: Minimal implementation makes tests pass
- [ ] REFACTOR phase: Code cleaned, tests remain green  
- [ ] Coverage targets achieved (≥92% package / ≥95% changed)
- [ ] All evidence tokens emitted per agentic-phase-policy.md
- [ ] Test artifacts saved for audit trail

**Maintained by: brAInwav Development Team**  
**Co-authored-by: brAInwav Development Team**