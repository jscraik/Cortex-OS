# GPU Acceleration Memory Safety Implementation Plan

**Task:** Fix GPU memory leaks with deterministic cleanup  
**Created:** 2025-10-12  
**Phase:** RED (Planning)  
**Status:** Draft

## 0) Task Directory & Baton Resolution

- **Task Slug:** `gpu-acceleration-memory-safety`
- **Task Dir:** `~/tasks/gpu-acceleration-memory-safety/`  
- **Baton Path:** `~/tasks/gpu-acceleration-memory-safety/json/baton.v1.json`

**Artifacts Created:**
- `implementation-plan.md` (this file)
- `tdd-plan.md` (comprehensive TDD approach)
- `implementation-checklist.md` (task checklist)
- `json/baton.v1.json` (task metadata)

## 1) File Tree of Proposed Changes

```
packages/memory-core/
├─ src/acceleration/GPUAcceleration.ts               UPDATE  – add deterministic memory reservation/release (Task 2,3)
├─ src/services/GraphRAGService.ts                   UPDATE  – invoke stopGPUAccelerationManager in close() (Task 4)
└─ __tests__/
   ├─ acceleration/GPUAcceleration.memory.test.ts    NEW     – memory leak detection tests (Task 1)
   └─ services/GraphRAGService.gpu-shutdown.test.ts  NEW     – service shutdown integration tests (Task 1)

tasks/gpu-acceleration-memory-safety/
├─ implementation-plan.md                            NEW     – this comprehensive plan
├─ tdd-plan.md                                       NEW     – TDD methodology and test matrix
├─ implementation-checklist.md                       NEW     – atomic task checklist
├─ test-logs/                                        NEW     – test execution logs
├─ verification/                                     NEW     – coverage/mutation reports
└─ json/baton.v1.json                               NEW     – task metadata
```

## 2) Implementation Plan (RED→GREEN→REFACTOR Tasks)

### **Task 1 — RED Phase: Failing Memory Tests**
**Goal:** Write failing tests that detect GPU memory leaks and improper shutdown  
**Files to touch:** 
- `packages/memory-core/__tests__/acceleration/GPUAcceleration.memory.test.ts`
- `packages/memory-core/__tests__/services/GraphRAGService.gpu-shutdown.test.ts`
- `~/tasks/gpu-acceleration-memory-safety/test-logs/red-phase.log`

**Edit steps:**
- Create memory leak detection test with mocked GPU device 
- Assert memory counters reset to zero after batch processing
- Create GraphRAG service shutdown test with GPU manager spy
- Assert `stopGPUAccelerationManager` called exactly once

**Implementation Aids:**

**Test scaffold (GPUAcceleration.memory.test.ts):**
```typescript
describe('GPU Memory Management', () => {
  test('should release all GPU memory after batch processing', async () => {
    // Mock GPU device with memory tracking
    const mockDevice = { memoryTotal: 1000, memoryUsed: 0, memoryFree: 1000 };
    const manager = getGPUAccelerationManager();
    (manager as any).devices = [mockDevice]; // Test access
    
    // Process embeddings that would allocate memory
    await manager.generateEmbeddings(['test text'], { preferGPU: true });
    
    // Memory should be fully released - THIS WILL FAIL INITIALLY
    expect(mockDevice.memoryUsed).toBe(0);
    expect(mockDevice.memoryFree).toBe(mockDevice.memoryTotal);
  });
  
  test('should clean up timers and queues on stop()', async () => {
    const manager = getGPUAccelerationManager();
    await manager.stop();
    
    // Should reset all tracking - THIS WILL FAIL INITIALLY  
    expect((manager as any).processingBatches.size).toBe(0);
    expect((manager as any).activeReservations.size).toBe(0);
  });
});
```

**Test scaffold (GraphRAGService.gpu-shutdown.test.ts):**
```typescript
import { vi } from 'vitest';

vi.mock('../src/acceleration/GPUAcceleration.js', () => ({
  getGPUAccelerationManager: vi.fn(),
  stopGPUAccelerationManager: vi.fn()
}));

describe('GraphRAG Service GPU Shutdown', () => {
  test('should stop GPU manager when service closes', async () => {
    const { stopGPUAccelerationManager } = await import('../src/acceleration/GPUAcceleration.js');
    const service = new GraphRAGService(minimalConfig);
    
    await service.close();
    
    // THIS WILL FAIL until we add the call
    expect(stopGPUAccelerationManager).toHaveBeenCalledTimes(1);
  });
});
```

**Run & verify:** `pnpm --filter memory-core test -- --reporter=verbose`  
**Expected:** Tests fail with memory leak detection and missing GPU shutdown call  
**Commit:** `test(memory-core): add failing GPU memory safety tests`  
**Backout:** `git revert -n HEAD`

### **Task 2 — GREEN Phase: Memory Reservation System**
**Goal:** Implement deterministic GPU memory reservation/release mechanism  
**Files to touch:**
- `packages/memory-core/src/acceleration/GPUAcceleration.ts`
- `~/tasks/gpu-acceleration-memory-safety/test-logs/green-memory.log`

**Edit steps:**
- Add `activeReservations: Map<string, MemoryReservation>` to GPUAccelerationManager
- Create `reserveDeviceMemory(device, bytes, batchId)` private method
- Return `release()` closure that updates device counters deterministically
- Wrap `processWithGPU` in try/finally with reservation/release

**Implementation Aids:**

**Patch hint (unified diff):**
```diff
// In GPUAccelerationManager class
+ private activeReservations = new Map<string, MemoryReservation>();
+
+ private reserveDeviceMemory(
+   device: GPUDeviceInfo,
+   bytes: number, 
+   batchId: string
+ ): { release: (success: boolean) => void } {
+   if (device.memoryFree < bytes) {
+     throw new Error(`brAInwav: Insufficient GPU memory: need ${bytes}MB, have ${device.memoryFree}MB`);
+   }
+   
+   device.memoryUsed += bytes;
+   device.memoryFree -= bytes;
+   
+   const reservation = { device, bytes, batchId, timestamp: Date.now() };
+   this.activeReservations.set(batchId, reservation);
+   
+   return {
+     release: (success: boolean) => {
+       if (this.activeReservations.has(batchId)) {
+         device.memoryUsed -= bytes;
+         device.memoryFree += bytes;
+         this.activeReservations.delete(batchId);
+       }
+     }
+   };
+ }

// In generateEmbeddings method
   const batchId = request.batchId || randomUUID();
+  const reservation = this.reserveDeviceMemory(selectedDevice, estimatedMemory, batchId);
   
   try {
     const embeddings = await this.processWithGPU(texts, selectedDevice);
+    reservation.release(true);
     return embeddings;
   } catch (error) {
+    reservation.release(false);
     throw error;
   }
```

**Run & verify:** `pnpm --filter memory-core test -- GPUAcceleration.memory.test.ts`  
**Expected:** Memory leak test passes, device counters reset correctly  
**Commit:** `feat(memory-core): add GPU memory reservation system`  
**Backout:** `git checkout HEAD~1 -- packages/memory-core/src/acceleration/GPUAcceleration.ts`

### **Task 3 — GREEN Phase: Stop() Method Enhancement**
**Goal:** Enhance stop() method to clean all reservations and tracking  
**Files to touch:**
- `packages/memory-core/src/acceleration/GPUAcceleration.ts`
- `~/tasks/gpu-acceleration-memory-safety/test-logs/green-stop.log`

**Edit steps:**
- Clear `activeReservations` map in `stop()` method
- Reset all device memory counters to initial state
- Clear `processingBatches` and any timer references
- Add defensive logging for leaked reservations

**Implementation Aids:**

**Patch hint (unified diff):**
```diff
// In stop() method
   async stop(): Promise<void> {
     this.isShuttingDown = true;
     
+    // Clean up any remaining reservations
+    if (this.activeReservations.size > 0) {
+      console.warn('[brAInwav] GPU reservations leaked during shutdown', {
+        brand: 'brAInwav',
+        timestamp: new Date().toISOString(),
+        leakedCount: this.activeReservations.size,
+        reservations: Array.from(this.activeReservations.keys())
+      });
+      
+      // Force cleanup
+      for (const [batchId, reservation] of this.activeReservations) {
+        reservation.device.memoryUsed -= reservation.bytes;
+        reservation.device.memoryFree += reservation.bytes;
+      }
+      this.activeReservations.clear();
+    }
+    
     // Clear processing state
     this.processingBatches.clear();
+    
+    // Reset device memory counters to baseline
+    for (const device of this.devices) {
+      device.memoryUsed = 0;
+      device.memoryFree = device.memoryTotal;
+    }
```

**Run & verify:** `pnpm --filter memory-core test -- GPUAcceleration.memory.test.ts`  
**Expected:** Stop cleanup test passes, no leaked reservations  
**Commit:** `feat(memory-core): enhance GPU manager stop() cleanup`  
**Backout:** `git checkout HEAD~1 -- packages/memory-core/src/acceleration/GPUAcceleration.ts`

### **Task 4 — GREEN Phase: GraphRAG Service Integration**
**Goal:** Add GPU shutdown call to GraphRAGService.close()  
**Files to touch:**
- `packages/memory-core/src/services/GraphRAGService.ts`  
- `~/tasks/gpu-acceleration-memory-safety/test-logs/green-service.log`

**Edit steps:**
- Import `stopGPUAccelerationManager` from acceleration module
- Add `await stopGPUAccelerationManager()` call in close() method
- Wrap in try/catch with brAInwav-branded error logging
- Place before Prisma shutdown for proper cleanup order

**Implementation Aids:**

**Patch hint (unified diff):**
```diff
// At top of file, update existing import
- import { getGPUAccelerationManager, type GPUAccelerationConfig } from '../acceleration/GPUAcceleration.js';
+ import { 
+   getGPUAccelerationManager, 
+   stopGPUAccelerationManager,
+   type GPUAccelerationConfig 
+ } from '../acceleration/GPUAcceleration.js';

// In close() method, before shutdownPrisma()
   async close(): Promise<void> {
     // ... existing cleanup code ...
     
+    // Shutdown GPU acceleration manager
+    try {
+      await stopGPUAccelerationManager();
+    } catch (error) {
+      console.error('[brAInwav] Failed to stop GPU acceleration manager', {
+        brand: 'brAInwav',
+        timestamp: new Date().toISOString(),
+        error: error instanceof Error ? error.message : String(error),
+        context: 'GraphRAGService.close'
+      });
+      // Don't throw - continue with other cleanup
+    }
+    
     await shutdownPrisma();
```

**Run & verify:** `pnpm --filter memory-core test -- GraphRAGService.gpu-shutdown.test.ts`  
**Expected:** Service shutdown test passes, GPU manager stop called  
**Commit:** `feat(memory-core): add GPU shutdown to GraphRAG service close`  
**Backout:** `git checkout HEAD~1 -- packages/memory-core/src/services/GraphRAGService.ts`

### **Task 5 — REFACTOR Phase: Documentation & Observability**
**Goal:** Add comprehensive logging and inline documentation  
**Files to touch:**
- `packages/memory-core/src/acceleration/GPUAcceleration.ts`
- `~/tasks/gpu-acceleration-memory-safety/refactoring/docs.md`

**Edit steps:**
- Add TSDoc comments for new reservation methods
- Enhance logging with reservation tracking metrics
- Add performance metrics for memory utilization
- Update method signatures for clarity

**Implementation Aids:**

**Documentation additions:**
```typescript
/**
 * Reserves GPU device memory for a batch operation with automatic cleanup
 * 
 * @param device - Target GPU device to reserve memory on
 * @param bytes - Memory amount to reserve in megabytes  
 * @param batchId - Unique identifier for tracking this reservation
 * @returns Release function that must be called to free memory
 * @throws Error if insufficient memory available
 * 
 * @example
 * const reservation = this.reserveDeviceMemory(device, 256, 'batch-123');
 * try {
 *   await processEmbeddings();
 *   reservation.release(true);
 * } catch (error) {
 *   reservation.release(false);
 *   throw error;
 * }
 */
private reserveDeviceMemory(device: GPUDeviceInfo, bytes: number, batchId: string)
```

**Run & verify:** `pnpm --filter memory-core build && pnpm --filter memory-core test`  
**Expected:** All tests pass, documentation generated, no lint errors  
**Commit:** `docs(memory-core): add GPU memory safety documentation`  
**Backout:** `git checkout HEAD~1 -- packages/memory-core/src/acceleration/GPUAcceleration.ts`

## 3) Technical Rationale

**Memory Safety Pattern:** Implements deterministic reservation/release pattern consistent with RAII principles, ensuring GPU memory leaks are impossible through automatic cleanup via closures.

**Service Lifecycle Integration:** Leverages existing `close()` method pattern used throughout Cortex-OS services (ML optimization, CDN managers) for consistent shutdown behavior.

**Singleton Management:** Uses existing `stopGPUAccelerationManager()` function to maintain single point of control without introducing new dependencies.

**Error Resilience:** try/catch/finally patterns ensure memory cleanup occurs even during exceptions, preventing resource leaks during error conditions.

**Observability:** brAInwav-branded logging provides clear audit trail for memory operations and leak detection.

## 4) Dependency Impact

**Internal Refactors:**
- New import of `stopGPUAccelerationManager` in GraphRAGService.ts
- Enhanced type definitions for memory reservation tracking
- No breaking changes to existing API surface

**External Packages:** None - uses existing Vitest, TypeScript toolchain  
**Config/Env Changes:** None required  
**Migration Notes:** Backward compatible - existing code continues working unchanged

## 5) Risks & Mitigations

**Risk:** Concurrency could cause double-release of reservations if batch promises settle multiple times  
**Mitigation:** Map-based tracking with idempotent release() - check existence before cleanup, delete key after release

**Risk:** Test timing dependencies could cause flake in memory assertions  
**Mitigation:** Use Vitest fake timers and deterministic mock devices, avoid real GPU hardware dependencies  

**Risk:** Mocked modules diverging from real implementation behavior  
**Mitigation:** Minimal mocking scope - only constructor-heavy dependencies, focus assertions on call counts not complex behavior

**Risk:** Memory leak detection could miss edge cases in production GPU operations  
**Mitigation:** Defensive logging in stop() method warns about leaked reservations, provides audit trail for investigation

## 6) Testing & Validation Strategy

**Test Matrix:**
- ✅ **Happy Path:** Normal batch processing with proper memory release
- ✅ **Error Path:** Exception during GPU processing still releases memory  
- ✅ **Boundary:** Zero memory available triggers appropriate error
- ✅ **Idempotency:** Multiple release() calls don't double-modify counters
- ✅ **Shutdown:** stop() method cleans all reservations and resets state
- ✅ **Integration:** GraphRAG service close() invokes GPU manager shutdown

**Mock Strategy:**
- Mock GPU devices with controllable memory counters  
- Stub heavy dependencies (QdrantHybridSearch, Prisma) to no-op classes
- Spy on `stopGPUAccelerationManager` function for call verification

**Determinism:**
- Use Vitest fake timers for controllable async behavior
- Deterministic batchId generation for predictable reservation tracking
- Fixed mock device specifications for consistent memory calculations

**Coverage Target:** `≥92% package threshold / ≥95% changed lines`  
**Commands:** `pnpm --filter memory-core test:coverage`

**Manual QA Checklist:**
1. Start GraphRAG service with GPU acceleration enabled
2. Process multiple embedding batches to allocate GPU memory  
3. Call `service.close()` and verify clean shutdown logs
4. Restart service - should initialize with clean memory state
5. Verify no GPU process/memory leaks in system monitoring

**Artifacts:** All test logs saved to `~/tasks/gpu-acceleration-memory-safety/test-logs/`

## 7) Rollout / Migration Notes

**Deployment Strategy:** No feature flags required - internal behavior change only  
**Backward Compatibility:** Existing GraphRAG service APIs unchanged  
**Service Integration:** Runbooks already call `GraphRAGService.close()` - will automatically benefit  
**GPU Disabled Mode:** New code paths no-op gracefully when GPU acceleration disabled

## 8) Completion Criteria

- [ ] Code merged; CI green (all phases pass)
- [ ] Coverage ≥92% package / ≥95% changed lines  
- [ ] Mutation score ≥90% (where enabled)
- [ ] Lint/type/security gates clean (Semgrep, gitleaks, OSV)
- [ ] Documentation updated (inline TSDoc comments)
- [ ] `~/tasks/gpu-acceleration-memory-safety/SUMMARY.md` completed with outcomes
- [ ] Memory leak regression tests in place and passing
- [ ] GraphRAG service shutdown integration verified

---

**Ready-to-Run Commands:**
```bash
# Install and verify environment
pnpm install --filter memory-core
pnpm --filter memory-core build

# Development cycle  
pnpm --filter memory-core lint
pnpm --filter memory-core typecheck  
pnpm --filter memory-core test
pnpm --filter memory-core test:coverage

# Targeted testing
pnpm --filter memory-core test -- GPUAcceleration.memory.test.ts
pnpm --filter memory-core test -- GraphRAGService.gpu-shutdown.test.ts
```

**Function Signatures to Create/Modify:**
```typescript
// New private method
private reserveDeviceMemory(device: GPUDeviceInfo, bytes: number, batchId: string): { release: (success: boolean) => void }

// Enhanced existing method  
async stop(): Promise<void> // Add reservation cleanup

// Import addition in GraphRAGService
import { stopGPUAccelerationManager } from '../acceleration/GPUAcceleration.js'
```

---
**Maintained by: brAInwav Development Team**  
**Co-authored-by: brAInwav Development Team**