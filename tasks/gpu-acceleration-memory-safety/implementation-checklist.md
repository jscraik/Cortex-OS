# Implementation Checklist: GPU Acceleration Memory Safety

**Task:** gpu-acceleration-memory-safety  
**Created:** 2025-10-12  
**Method:** RED→GREEN→REFACTOR TDD approach  
**Assignee:** TBD  

## Phase Progression Checklist

### **Phase R (RED) - Write Failing Tests**
- [ ] **R.1** Create task directory structure and baton.v1.json
- [ ] **R.2** Write failing memory leak detection test (GPUAcceleration.memory.test.ts)
- [ ] **R.3** Write failing service shutdown test (GraphRAGService.gpu-shutdown.test.ts)
- [ ] **R.4** Verify tests fail with expected error messages
- [ ] **R.5** Emit evidence token: `PHASE_TRANSITION:PLANNING->RED`
- [ ] **R.6** Emit evidence token: `AGENTS_MD_SHA:<sha>`
- [ ] **R.7** Emit evidence token: `brAInwav-vibe-check`
- [ ] **R.8** Emit evidence token: `TIME_FRESHNESS:OK tz=<tz> today=<date>`
- [ ] **R.9** Commit: `test(memory-core): add failing GPU memory safety tests`
- [ ] **R.10** **Auto-advance to G when:** CI shows tests fail → pass on next commit

### **Phase G (GREEN) - Implement to Pass**
- [ ] **G.1** Add `activeReservations` Map to GPUAccelerationManager class
- [ ] **G.2** Implement `reserveDeviceMemory()` private method with release closure
- [ ] **G.3** Wrap `generateEmbeddings` with reservation/release in try/finally
- [ ] **G.4** Enhance `stop()` method to clean reservations and reset device memory
- [ ] **G.5** Add defensive logging for leaked reservations during shutdown
- [ ] **G.6** Import `stopGPUAccelerationManager` in GraphRAGService.ts
- [ ] **G.7** Add GPU shutdown call to GraphRAGService.close() method
- [ ] **G.8** Wrap GPU shutdown in try/catch with brAInwav error logging
- [ ] **G.9** Verify all tests pass: `pnpm --filter memory-core test`
- [ ] **G.10** Verify coverage targets: ≥92% package / ≥95% changed lines
- [ ] **G.11** Emit evidence token: `PHASE_TRANSITION:RED->GREEN`
- [ ] **G.12** Emit evidence token: `COVERAGE:OK CHANGED_LINES:OK`
- [ ] **G.13** Commit: `feat(memory-core): implement GPU memory reservation system`
- [ ] **G.14** Commit: `feat(memory-core): add GPU shutdown to GraphRAG service`
- [ ] **G.15** **Auto-advance to F when:** Tests pass + Coverage ≥90% + Mutation ≥90%

### **Phase F (FINISHED) - Refactor & Docs**
- [ ] **F.1** Add comprehensive TSDoc comments for new methods
- [ ] **F.2** Enhance logging with reservation tracking metrics
- [ ] **F.3** Add performance metrics for memory utilization patterns
- [ ] **F.4** Update inline documentation for clarity and examples
- [ ] **F.5** Refactor any code duplication in reservation logic
- [ ] **F.6** Optimize error messages for better debugging experience
- [ ] **F.7** Run accessibility checks: `N/A` (backend only)
- [ ] **F.8** Run structure validation: `pnpm structure:validate`
- [ ] **F.9** Run security scans: Semgrep, gitleaks, OSV
- [ ] **F.10** Record Local Memory entry for decisions/refactors
- [ ] **F.11** Emit evidence token: `PHASE_TRANSITION:GREEN->REFACTOR`
- [ ] **F.12** Emit evidence token: `A11Y_REPORT:OK` (N/A backend)
- [ ] **F.13** Emit evidence token: `STRUCTURE_GUARD:OK`
- [ ] **F.14** Emit evidence token: `MEMORY_PARITY:OK`
- [ ] **F.15** Commit: `docs(memory-core): add GPU memory safety documentation`
- [ ] **F.16** **Auto-advance to REVIEW when:** All evidence tokens present

### **Phase REVIEW - Human Approval**
- [ ] **REVIEW.1** Execute Code Review Checklist: `/.cortex/rules/code-review-checklist.md`
- [ ] **REVIEW.2** Verify all BLOCKER items are PASS
- [ ] **REVIEW.3** Human approval for merge
- [ ] **REVIEW.4** Emit evidence token: `CODE-REVIEW-CHECKLIST: /.cortex/rules/code-review-checklist.md`

## Task-Specific Implementation Items

### **Task 1: RED Phase - Failing Tests**
- [ ] **T1.1** Create `packages/memory-core/__tests__/acceleration/GPUAcceleration.memory.test.ts`
- [ ] **T1.2** Create mock GPU device with memory tracking capabilities
- [ ] **T1.3** Write test: "should release all GPU memory after batch processing"
- [ ] **T1.4** Write test: "should clean up timers and queues on stop()"
- [ ] **T1.5** Create `packages/memory-core/__tests__/services/GraphRAGService.gpu-shutdown.test.ts`
- [ ] **T1.6** Mock stopGPUAccelerationManager function for spy testing
- [ ] **T1.7** Write test: "should stop GPU manager when service closes"
- [ ] **T1.8** Verify tests fail with memory leak detection errors
- [ ] **T1.9** Save test failure logs to `~/tasks/gpu-acceleration-memory-safety/test-logs/red-phase.log`

### **Task 2: GREEN Phase - Memory Reservation System**
- [ ] **T2.1** Add `private activeReservations = new Map<string, MemoryReservation>()` to class
- [ ] **T2.2** Create `MemoryReservation` interface with device, bytes, batchId, timestamp
- [ ] **T2.3** Implement `reserveDeviceMemory(device, bytes, batchId)` private method
- [ ] **T2.4** Return release closure that updates device counters deterministically
- [ ] **T2.5** Validate memory availability before reservation (throw on insufficient)
- [ ] **T2.6** Update device.memoryUsed and device.memoryFree atomically
- [ ] **T2.7** Track reservation in activeReservations Map by batchId
- [ ] **T2.8** Implement idempotent release() function with existence check

### **Task 3: GREEN Phase - Integrate Reservations**
- [ ] **T3.1** Wrap `processWithGPU` calls with memory reservation
- [ ] **T3.2** Calculate estimated memory requirement for batch
- [ ] **T3.3** Acquire reservation before GPU processing
- [ ] **T3.4** Use try/finally to ensure release() called on success/failure
- [ ] **T3.5** Pass success boolean to release() for metrics tracking
- [ ] **T3.6** Handle reservation errors gracefully (insufficient memory)
- [ ] **T3.7** Maintain existing API compatibility - no breaking changes

### **Task 4: GREEN Phase - Stop() Enhancement**
- [ ] **T4.1** Clear activeReservations Map in stop() method
- [ ] **T4.2** Check for leaked reservations before clearing
- [ ] **T4.3** Log leaked reservations with brAInwav branding and details
- [ ] **T4.4** Force cleanup leaked reservations (restore device memory)
- [ ] **T4.5** Reset all device memory counters to baseline state
- [ ] **T4.6** Clear processingBatches and timer references
- [ ] **T4.7** Set isShuttingDown flag early to prevent new reservations

### **Task 5: GREEN Phase - GraphRAG Service Integration**
- [ ] **T5.1** Import stopGPUAccelerationManager in GraphRAGService.ts
- [ ] **T5.2** Add GPU shutdown call in close() method before Prisma
- [ ] **T5.3** Wrap GPU shutdown in try/catch for error resilience
- [ ] **T5.4** Log GPU shutdown errors with brAInwav branding
- [ ] **T5.5** Ensure Prisma shutdown continues even if GPU stop fails
- [ ] **T5.6** Maintain existing close() method behavior and timing
- [ ] **T5.7** Handle GPU disabled mode gracefully (no-op if disabled)

### **Task 6: REFACTOR Phase - Documentation & Polish**
- [ ] **T6.1** Add TSDoc comments for reserveDeviceMemory method
- [ ] **T6.2** Document MemoryReservation interface and usage patterns
- [ ] **T6.3** Add examples for proper reservation/release usage
- [ ] **T6.4** Enhance error messages with context and suggested actions
- [ ] **T6.5** Add performance logging for reservation overhead
- [ ] **T6.6** Document memory safety guarantees in class-level docs
- [ ] **T6.7** Review and optimize any code duplication

## Quality Gates Verification

### **Testing & Coverage**
- [ ] All unit tests passing: `pnpm --filter memory-core test`
- [ ] Coverage ≥92% package: `pnpm --filter memory-core test:coverage`
- [ ] Coverage ≥95% changed lines: Verify in coverage report
- [ ] Mutation score ≥90%: `pnpm --filter memory-core test:mutation`
- [ ] No test flakes: Run tests 3x to verify determinism

### **Code Quality**
- [ ] TypeScript compilation: `pnpm --filter memory-core typecheck`
- [ ] Linting clean: `pnpm --filter memory-core lint`
- [ ] No console.log in production paths (only console.info/warn/error)
- [ ] All functions ≤40 lines per CODESTYLE.md
- [ ] Named exports only (no default exports)
- [ ] brAInwav branding in all log messages

### **Security & Structure**
- [ ] Semgrep security scan: `pnpm --filter memory-core security:scan`
- [ ] No secrets committed: `gitleaks detect`
- [ ] OSV vulnerability scan clean
- [ ] Structure validation: `pnpm structure:validate`
- [ ] Package dependencies validated

### **Integration & Performance**
- [ ] GraphRAG service starts/stops cleanly with GPU enabled
- [ ] Memory leak regression test passes
- [ ] GPU manager stop() completes within 100ms
- [ ] Service shutdown includes GPU cleanup in logs
- [ ] No dangling GPU processes after service stop

## Artifacts & Documentation

### **Test Artifacts**
- [ ] Test execution logs saved to `test-logs/`
- [ ] Coverage reports saved to `verification/`
- [ ] Performance benchmarks recorded
- [ ] Security scan results archived

### **Documentation Updates**
- [ ] Inline code documentation complete
- [ ] Method signatures documented with examples
- [ ] Error handling patterns documented
- [ ] Memory safety guarantees explained

### **Task Completion**
- [ ] SUMMARY.md updated with implementation outcomes
- [ ] Lessons learned documented for future reference
- [ ] Local Memory entry recorded for decisions made
- [ ] All evidence tokens collected and verified

## Commands Reference

### **Development Workflow**
```bash
# Setup and validation
pnpm install --filter memory-core
pnpm --filter memory-core build

# TDD cycle
pnpm --filter memory-core test:watch -- GPUAcceleration.memory.test.ts
pnpm --filter memory-core test -- --reporter=verbose
pnpm --filter memory-core test:coverage

# Quality gates
pnpm --filter memory-core lint
pnpm --filter memory-core typecheck
pnpm --filter memory-core security:scan
pnpm structure:validate
```

### **Evidence Collection**
```bash
# Phase transition tokens
echo "PHASE_TRANSITION:PLANNING->RED"
echo "AGENTS_MD_SHA:$(sha256sum packages/memory-core/AGENTS.md | cut -d' ' -f1)"
echo "brAInwav-vibe-check"
echo "TIME_FRESHNESS:OK tz=$(date +'%Z') today=$(date +'%Y-%m-%d')"
```

---

**Status:** Ready for execution  
**Next Action:** Begin RED phase with failing test creation  
**Maintained by: brAInwav Development Team**  
**Co-authored-by: brAInwav Development Team**