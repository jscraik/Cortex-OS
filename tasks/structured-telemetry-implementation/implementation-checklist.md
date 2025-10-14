# Implementation Checklist: Structured Telemetry Implementation

**Task ID**: `structured-telemetry-implementation`  
**Created**: 2025-01-12  
**Status**: Ready for Execution  
**Phase**: RED (Write Failing Tests First)

> **TDD Mandate**: Follow RED-GREEN-REFACTOR cycle strictly. Mark each item when complete.

---

## Phase 0: Setup & Scaffolding

### Task 1 — JSON Schema & Type Foundation
- [ ] Create `schemas/agent-event.schema.json` with vendor-neutral AgentEvent structure
  - [ ] Define required fields: timestamp, agentId, phase, event, correlationId
  - [ ] Add optional fields: labels, metrics, outcome  
  - [ ] Use JSON Schema Draft 7 format
- [ ] Update `schemas/README.md` with telemetry schema entry
- [ ] Create `packages/telemetry/src/types.ts` with Zod schemas
  - [ ] AgentEventSchema matching JSON schema
  - [ ] EventName enum (run_started, run_finished, plan_created, tool_invoked, tool_result)
  - [ ] Phase enum (planning, execution, completion)
- [ ] **Verification**: `pnpm test packages/telemetry -- types.test.ts` shows 1 failing test

### Task 2 — Package Infrastructure Setup  
- [ ] Create `packages/telemetry/` directory structure
- [ ] Create `packages/telemetry/package.json`
  - [ ] Name: `@brainwav/telemetry`
  - [ ] Type: `module` (ESM)
  - [ ] Exports: `{".": "./src/index.ts", "./types": "./src/types.ts"}`
  - [ ] Dependencies: `zod@^3.22.0`
  - [ ] DevDependencies: `vitest@^1.0.0`
- [ ] Create `packages/telemetry/project.json` for Nx integration
- [ ] Create `packages/telemetry/tsconfig.json` with `composite: true`
- [ ] Create `packages/telemetry/vitest.config.ts`
- [ ] Create `packages/telemetry/AGENTS.md` inheriting repo governance
- [ ] Create `packages/telemetry/README.md` with usage and privacy guidance
- [ ] Update `tsconfig.base.json` path mappings for `@brainwav/telemetry`
- [ ] **Verification**: `pnpm install && pnpm build:smart` resolves package

---

## Phase 1: Write Failing Tests (RED)

### Task 3 — Core Telemetry Emitter Tests
- [ ] Create `packages/telemetry/tests/emitter.test.ts`
- [ ] **Test 1**: `should emit AgentEvent to default topic when emit() called`
  - [ ] Mock bus with publish spy
  - [ ] Verify default topic 'cortex.a2a.events' used
  - [ ] Status: ❌ RED (expected)
- [ ] **Test 2**: `should respect custom topic configuration`  
  - [ ] Test custom topic in EmitterOpts
  - [ ] Status: ❌ RED (expected)
- [ ] **Test 3**: `should apply redaction filter to sensitive labels with brAInwav context`
  - [ ] Test redaction removes labels.prompt
  - [ ] Verify brAInwav redaction notice added
  - [ ] Status: ❌ RED (expected)
- [ ] **Test 4**: `should return phase helper with started/finished closures`
  - [ ] Test phase() method returns object with methods
  - [ ] Status: ❌ RED (expected)
- [ ] **Test 5**: `should emit phase events with correlation and timing`
  - [ ] Test started() and finished() emit correlated events
  - [ ] Status: ❌ RED (expected)
- [ ] **Test 6**: `should handle bus publish errors gracefully with brAInwav error context`
  - [ ] Mock bus that throws, verify error handling
  - [ ] Status: ❌ RED (expected)

### Task 4 — Type Definition Tests
- [ ] Create `packages/telemetry/tests/types.test.ts`
- [ ] **Test 1**: `should validate AgentEvent schema with Zod`
  - [ ] Valid AgentEvent passes validation
  - [ ] Status: ❌ RED (expected)
- [ ] **Test 2**: `should reject invalid AgentEvent with missing required fields`
  - [ ] Missing timestamp fails with brAInwav error context
  - [ ] Status: ❌ RED (expected)
- [ ] **Test 3**: `should validate EventName enum values`
  - [ ] All enum values accepted by schema
  - [ ] Status: ❌ RED (expected)

### Task 5 — Integration Test Scaffolds
- [ ] Create `packages/orchestration/tests/telemetry/structured-telemetry.test.ts`
- [ ] **Test 1**: `should map PlanCreated bus event to plan_created AgentEvent`
  - [ ] Mock bus and telemetry emitter
  - [ ] Status: ❌ RED (expected)
- [ ] **Test 2**: `should map RoutingFallback to reroute AgentEvent with error context`
  - [ ] Test error event mapping with brAInwav context
  - [ ] Status: ❌ RED (expected)  
- [ ] **Test 3**: `should unsubscribe from bus events on bridge stop()`
  - [ ] Test cleanup lifecycle
  - [ ] Status: ❌ RED (expected)

- [ ] Create `apps/cortex-os/tests/telemetry.integration.test.ts`
- [ ] **Test 1**: `should emit tool_invoked event when MCP tool starts`
  - [ ] Mock A2A bus and tool envelope
  - [ ] Status: ❌ RED (expected)
- [ ] **Test 2**: `should emit tool_result event with metrics when tool completes`
  - [ ] Test completion with timing metrics
  - [ ] Status: ❌ RED (expected)
- [ ] **Test 3**: `should apply redaction to tool events removing sensitive prompt data`
  - [ ] Test privacy protection in tool events
  - [ ] Status: ❌ RED (expected)

### Task 6 — Run All Tests - Verify RED State
- [ ] Run `pnpm test packages/telemetry` → expect all tests failing
- [ ] Run `pnpm test packages/orchestration -- telemetry` → expect all tests failing
- [ ] Run `pnpm test apps/cortex-os -- telemetry` → expect all tests failing
- [ ] **Confirmation**: All telemetry-related tests are RED (failing as expected)

---

## Phase 2: Minimal Implementation (GREEN)

### Task 7 — Core Types Implementation
- [ ] Implement `packages/telemetry/src/types.ts`
  - [ ] AgentEventSchema with Zod validation (≤40 lines)
  - [ ] EventName enum export (≤40 lines)
  - [ ] Phase enum export (≤40 lines)
  - [ ] AgentEvent interface export
- [ ] Create `packages/telemetry/src/index.ts` with named exports only
  - [ ] Export Telemetry, Bus, EmitterOpts, AgentEvent, EventName, Phase
- [ ] **Verification**: Run type tests → expect GREEN for basic validation

### Task 8 — Telemetry Emitter Core  
- [ ] Implement `packages/telemetry/src/emitter.ts`
  - [ ] Bus interface definition (≤40 lines)
  - [ ] EmitterOpts interface (≤40 lines)  
  - [ ] Telemetry class constructor (≤40 lines)
  - [ ] emit() method with validation and redaction (≤40 lines)
  - [ ] phase() helper with started/finished closures (≤40 lines)
  - [ ] Error handling with brAInwav context (≤40 lines)
- [ ] **Verification**: Run emitter tests → expect GREEN for core functionality

### Task 9 — A2A Schema Registration
- [ ] Update `apps/cortex-os/src/a2a.ts`
  - [ ] Add 'cortex.telemetry.agent.event' to topics (≤40 lines)
  - [ ] Define CortexOsTelemetryEventSchema (≤40 lines)
  - [ ] Register schema with version 1.0.0 and tags (≤40 lines)
  - [ ] Include example with brAInwav context (≤40 lines)
- [ ] **Verification**: Run A2A tests → expect schema registration to pass

### Task 10 — Runtime Integration
- [ ] Update `apps/cortex-os/package.json` to depend on `@brainwav/telemetry`
- [ ] Update `apps/cortex-os/src/runtime.ts`
  - [ ] Import Telemetry and setTelemetryEmitter (≤40 lines)
  - [ ] Create bus adapter wrapping A2A publish (≤40 lines)
  - [ ] Instantiate telemetry with redaction config (≤40 lines)
  - [ ] Add tool start/complete instrumentation (≤40 lines)
  - [ ] Include brAInwav branding in tool events
- [ ] **Verification**: Run runtime integration tests → expect GREEN

### Task 11 — Service Layer Wiring  
- [ ] Update `apps/cortex-os/src/services.ts`
  - [ ] Add telemetry state management (≤40 lines)
  - [ ] Implement setTelemetryEmitter() function (≤40 lines)
  - [ ] Wrap facade run with lifecycle events (≤40 lines)
  - [ ] Add error handling with brAInwav context (≤40 lines)
- [ ] **Verification**: Run service tests → expect lifecycle instrumentation GREEN

### Task 12 — Orchestration Bridge Implementation
- [ ] Update `packages/orchestration/package.json` to depend on `@brainwav/telemetry`
- [ ] Create `packages/orchestration/src/observability/structured-telemetry.ts`
  - [ ] StructuredTelemetryBridge class (≤40 lines per method)
  - [ ] Bus event subscription mapping (≤40 lines)
  - [ ] start() method with event handlers (≤40 lines)
  - [ ] stop() method with cleanup (≤40 lines)
  - [ ] brAInwav context in all mapped events
- [ ] **Verification**: Run bridge tests → expect GREEN for event mapping

### Task 13 — Orchestration Facade Integration
- [ ] Update `packages/orchestration/src/service.ts`
  - [ ] Add setTelemetry() method to facade (≤40 lines)
  - [ ] Track bridge instance and state (≤40 lines)
  - [ ] Integrate bridge lifecycle in run method (≤40 lines)
  - [ ] Add cleanup in shutdown (≤40 lines)
- [ ] Update `packages/orchestration/src/index.ts` to export telemetry types
- [ ] **Verification**: Run orchestration tests → expect GREEN for facade integration

### Task 14 — Integration Test Implementation
- [ ] Implement `apps/cortex-os/tests/telemetry.integration.test.ts`
  - [ ] Mock A2A bus with publish spy
  - [ ] Test runtime telemetry wiring
  - [ ] Verify tool event emission
  - [ ] Validate redaction functionality
  - [ ] brAInwav branding verification
- [ ] Implement `packages/orchestration/tests/telemetry/structured-telemetry.test.ts`
  - [ ] Mock orchestration bus events
  - [ ] Test event mapping to AgentEvents
  - [ ] Verify bridge lifecycle
- [ ] **Verification**: Run integration tests → expect GREEN for end-to-end flow

### Task 15 — All Tests GREEN Verification
- [ ] Run `pnpm test:smart` → expect 100% pass rate
- [ ] Run `pnpm test packages/telemetry` → all GREEN
- [ ] Run `pnpm test packages/orchestration -- telemetry` → all GREEN  
- [ ] Run `pnpm test apps/cortex-os -- telemetry` → all GREEN
- [ ] **Milestone**: All telemetry tests GREEN ✅

---

## Phase 3: Refactor (REFACTOR while keeping GREEN)

### Task 16 — Code Quality Improvements
- [ ] Extract common validation logic into shared utilities
- [ ] Verify all functions ≤40 lines (split if longer)
- [ ] Simplify complex conditionals with guard clauses
- [ ] Add JSDoc comments for public APIs with brAInwav context
- [ ] Verify named exports only (no default exports)
- [ ] **Verification**: Run tests → confirm all still GREEN

### Task 17 — Performance Optimization
- [ ] Add lightweight caching for schema validations
- [ ] Optimize event emission path
- [ ] Reduce unnecessary object allocations  
- [ ] Run performance tests if applicable
- [ ] **Verification**: Performance targets met, tests GREEN

### Task 18 — Error Handling Enhancement
- [ ] Standardize error messages with brAInwav branding
- [ ] Add structured error objects with error codes
- [ ] Improve error recovery for bus failures
- [ ] Add error context preservation
- [ ] **Verification**: Error handling tests GREEN

---

## Phase 4: Integration & Documentation

### Task 19 — Schema Documentation  
- [ ] Complete `schemas/agent-event.schema.json` documentation
- [ ] Update `schemas/README.md` with comprehensive telemetry entry
  - [ ] Document telemetry topic usage in A2A
  - [ ] Add schema validation examples
  - [ ] Include brAInwav usage context

### Task 20 — Package Documentation
- [ ] Complete `packages/telemetry/README.md`
  - [ ] Installation and basic usage examples
  - [ ] Privacy and redaction guidance
  - [ ] Complete API documentation
  - [ ] brAInwav branding and context examples
  - [ ] Performance characteristics
- [ ] Add inline code comments for complex logic
- [ ] Create usage examples in `packages/telemetry/examples/` if needed

### Task 21 — Contract Updates
- [ ] Verify MCP contract compatibility
- [ ] Update A2A event schemas in contracts if needed
- [ ] Test contract compatibility
- [ ] Update `libs/typescript/contracts` as required

---

## Phase 5: Quality Gates

### Task 22 — Linting & Formatting
- [ ] Run `pnpm biome:staged` → verify pass
- [ ] Run `pnpm lint:smart` → verify pass  
- [ ] Fix any linting violations
- [ ] **Status**: Linting clean ✅

### Task 23 — Type Checking
- [ ] Run `pnpm typecheck:smart` → verify pass
- [ ] Fix any type errors
- [ ] **Status**: Type checking clean ✅

### Task 24 — Testing & Coverage
- [ ] Run `pnpm test:smart` → verify 100% pass
- [ ] Run `pnpm test:coverage` → verify ≥90% global, ≥95% changed lines
- [ ] **Status**: Coverage targets met ✅

### Task 25 — Security Scanning
- [ ] Run `pnpm security:scan` → verify zero high findings
- [ ] Run `pnpm security:scan:gitleaks` → verify no secrets
- [ ] Fix any security issues
- [ ] **Status**: Security scan clean ✅

### Task 26 — Structure Validation
- [ ] Run `pnpm structure:validate` → verify pass
- [ ] Fix any structural violations
- [ ] **Status**: Structure validation clean ✅

---

## Phase 6: Review & Polish

### Task 27 — Code Review Preparation
- [ ] Self-review code for Constitution compliance
- [ ] Verify no mock/placeholder code in production paths
- [ ] Check brAInwav branding consistently applied
- [ ] Ensure all functions ≤40 lines
- [ ] **Status**: Constitution compliant ✅

### Task 28 — Documentation Updates
- [ ] Update root `CHANGELOG.md` with telemetry implementation entry
  - [ ] List affected packages and new capabilities
  - [ ] Document breaking changes (if any)
  - [ ] Include brAInwav context
- [ ] Update related README files if needed

### Task 29 — Local Memory Documentation
- [ ] Store implementation insights in local-memory MCP
- [ ] Document key architectural decisions and rationale
- [ ] Tag with relevant context: telemetry, observability, A2A, brAInwav
- [ ] **Status**: Architectural decisions documented ✅

### Task 30 — Final Verification & Deployment Readiness
- [ ] Run complete test suite one final time
- [ ] Verify all quality gates passing
- [ ] Check brAInwav branding throughout
- [ ] Confirm no TODO/FIXME comments in production code
- [ ] **Status**: Deployment ready ✅

---

## Completion Criteria Verification

- [ ] **Code merged**: All targeted tests passing ✅
- [ ] **Coverage**: ≥95% on changed files per AGENTS.md ✅  
- [ ] **Security/lint gates**: `pnpm security:scan` clean ✅
- [ ] **Documentation**: README, schemas, CHANGELOG updated ✅
- [ ] **TDD evidence**: Plan committed with executed evidence ✅
- [ ] **A2A integration**: Schema registered and validated ✅
- [ ] **Integration flow**: End-to-end telemetry verified ✅
- [ ] **brAInwav branding**: Consistently applied throughout ✅
- [ ] **Production ready**: No mock/placeholder code ✅
- [ ] **Architecture**: Local Memory documentation complete ✅

---

## Evidence Tracking

### Phase Transitions (for CI validation)
- [ ] `PHASE_TRANSITION:PLANNING->RED` - Tests written and failing
- [ ] `PHASE_TRANSITION:RED->GREEN` - Implementation makes tests pass  
- [ ] `PHASE_TRANSITION:GREEN->REFACTOR` - Code quality improvements
- [ ] `PHASE_TRANSITION:REFACTOR->REVIEW` - Quality gates and documentation

### Required Evidence Tokens
- [ ] `AGENTS_MD_SHA:<sha>` - Governance compliance
- [ ] `brAInwav-vibe-check` - Constitutional compliance verification
- [ ] `TIME_FRESHNESS:OK tz=<iana_tz> today=<yyyy-mm-dd>` - Temporal anchoring
- [ ] `COVERAGE:OK CHANGED_LINES:OK` - Coverage verification
- [ ] `STRUCTURE_GUARD:OK` - Structural validation
- [ ] `MEMORY_PARITY:OK` - Local memory documentation

### Conventional Commits
- [ ] All commits follow format: `type(scope): description`
- [ ] Include `Co-authored-by: brAInwav Development Team` in commits
- [ ] Atomic commits with tests and implementation together

---

**Created**: 2025-01-12  
**Last Updated**: 2025-01-12  
**Ready for Execution**: Yes  
**Phase**: RED (Ready to write failing tests)

Co-authored-by: brAInwav Development Team