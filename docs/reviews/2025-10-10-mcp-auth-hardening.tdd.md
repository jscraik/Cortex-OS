# TDD Plan: MCP HTTP Auth Hardening & Telemetry Alignment

**Task ID**: `mcp-http-auth-hardening-2025-10-10`
**Created**: 2025-10-10
**Status**: In Progress
**Estimated Effort**: 6 hours
**PRP Integration**: G2, G4, G6

---

## Task Summary

Implement security and observability improvements across the MCP server ecosystem: fail-fast HTTP startup when `MCP_API_KEY` is missing, replace placeholder resource streaming with validated content handling, align notification handling with shared telemetry/logging, and document new operational guidance for FastMCP deployments.

---

## PRP Gate Alignment

> **Integration Note**: This task aligns with PRP Runner quality gates to ensure consistent quality standards.

### Enforcement Profile Reference
- **Source**: Default brAInwav Enforcement Profile
- **Coverage Targets**:
  - Lines: ≥ 90%
  - Branches: ≥ 90%
  - Functions: ≥ 95%
  - Statements: ≥ 95%
- **Performance Budgets** (G6 alignment): reuse default ASBR transport budgets; no new UI surfaces.
- **Accessibility Target**: Not applicable (no UI changes)
- **Security**: Zero tolerances for Critical/High findings; Medium ≤ 5

### Gate Cross-References
- **G0 (Ideation)**: Covered by MCP ecosystem governance docs in `/.cortex/rules`
- **G1 (Architecture)**: FastMCP topology already approved; no deviations
- **G2 (Test Plan)**: This document (tests below) satisfies gate
- **G4 (Verification)**: Evidence captured via new tests and lint/type/test runs
- **Evidence Trail**: Will link artefacts in PR description referencing this plan

---

## Scope & Goals

### In Scope
- ✅ Enforce `MCP_API_KEY` requirement before binding HTTP transport
- ✅ Replace placeholder `resources/read` implementation with validated content providers
- ✅ Route MCP base server logging/notifications through shared logger + telemetry hooks
- ✅ Extend automated tests for feature toggles, resource reads, and notification queue resilience
- ✅ Update MCP documentation with deployment, rollback, and observability guidance

### Out of Scope
- ❌ Replacing STDIO transport pathways
- ❌ Introducing new FastMCP feature surfaces beyond prompts/resources/tools
- ❌ Refactoring unrelated packages outside `packages/mcp*`

### Success Criteria
1. HTTP transport refuses to start without `MCP_API_KEY` and logs actionable error
2. Resource reads return stored content with validation and structured logging
3. Notification handler handles queue saturation/errors without dropping events silently
4. Feature toggles verified via automated tests
5. Docs updated for ops, rollback, and telemetry workflows
6. All lint/type/test suites pass; coverage thresholds met/exceeded
7. No TODO/placeholder code remains in production paths touched

---

## Prerequisites & Dependencies

### Required Research
- [x] Governance pack review (`/.cortex/rules/agentic-coding-workflow.md`)
- [x] Existing MCP review notes (`docs/reviews/`)
- [ ] Additional stakeholder sign-off (captured post-implementation)

### Internal Dependencies
- **Package**: `@cortex-os/mcp-server` – fail-fast transport logic, env parsing
- **Package**: `@cortex-os/mcp` – base server abstractions, notifications
- **Package**: `@cortex-os/mcp-bridge` – shared telemetry helpers

### External Dependencies
- None beyond existing FastMCP and pino dependencies (already in workspace)

### Environment Setup
```bash
pnpm install
pnpm test --filter mcp-server --runInBand
pnpm test --filter mcp --runInBand
```

---

## Testing Strategy (Write Tests First!)

> **TDD Mandate**: All tests MUST be written and failing BEFORE implementation begins.

### Phase 1: Unit Tests (Write First)

#### Test Suite 1: HTTP Transport Guard
**File**: `packages/mcp-server/src/__tests__/transport-http-auth.guard.test.ts`

**Test Cases**:
1. **Test**: `should throw before starting HTTP transport when MCP_API_KEY is missing`
   - **Given**: `MCP_TRANSPORT` resolves to `http`; `MCP_API_KEY` undefined
   - **When**: `startTransport` executes
   - **Then**: Promise rejects with branded error; FastMCP `start` never called
   - **Coverage Target**: `startTransport`, HTTP guard branch

2. **Test**: `should allow HTTP transport when MCP_API_KEY is configured`
   - **Given**: `MCP_API_KEY` populated
   - **When**: `startTransport` executes
   - **Then**: FastMCP `start` invoked with HTTP options; controller resolves

3. **Test**: `should skip guard when STDIO transport explicitly selected`
   - **Given**: `MCP_TRANSPORT=stdio`
   - **When**: `startTransport`
   - **Then**: Guard bypassed; STDIO `start` executed

#### Test Suite 2: Resource Retrieval Pipeline
**File**: `packages/mcp/src/__tests__/server.resources.test.ts`

**Test Cases**:
1. **Test**: `should return persisted resource content with correct metadata`
   - **Given**: Resource registered with text payload
   - **When**: `resources/read` called
   - **Then**: Response contains original content, mime type, telemetry logged

2. **Test**: `should surface provider errors with branded HTTPException`
   - **Given**: Resource provider throws
   - **When**: `resources/read`
   - **Then**: Error response includes `[brAInwav]` message and appropriate code

3. **Test**: `should validate request schema and reject malformed URIs`
   - **Given**: Invalid params (missing `uri`)
   - **When**: `resources/read`
   - **Then**: Validation error thrown before provider invoked

#### Test Suite 3: Notification Queue Resilience
**File**: `packages/mcp/src/__tests__/notificationHandlers.resilience.test.ts`

**Test Cases**:
1. **Test**: `should continue processing when handler throws`
   - **Given**: Server emitNotification mock that throws on first call
   - **When**: Multiple events queued
   - **Then**: Subsequent events still processed; error logged once

2. **Test**: `should apply back-pressure metrics when queue exceeds threshold`
   - **Given**: Rapid event enqueues
   - **When**: Queue length crosses limit
   - **Then**: Logger records warning; metrics counter incremented

3. **Test**: `should expose queue stats via getStats`
   - **Given**: Events enqueued but not processed
   - **When**: `getStats`
   - **Then**: Returns accurate `queueSize`, `processing`

### Phase 2: Integration Tests (Write First)

#### Integration Test 1: Feature Toggle Enforcement
**File**: `packages/mcp-server/src/__tests__/prompts-resources-toggles.integration.test.ts`

**Scenario**: Validate that prompts/resources/tool registration respects env toggles and logs outcome via shared logger.

**Test Cases**:
1. **Test**: `should not register prompts when MCP_PROMPTS_ENABLED=false`
2. **Test**: `should not register resources when MCP_RESOURCES_ENABLED=false`
3. **Test**: `should log toggle decisions with branded event`

### Phases 3-5
- **E2E Tests**: Not applicable (no UI/user journey alterations)
- **Accessibility Tests**: Not applicable
- **Security Tests**: Covered via new auth guard unit tests; existing scanners remain in CI

---

## Tooling & Evidence

- Capture red/green/refactor states via `pnpm vitest --filter` snapshots
- Attach Vitest outputs and updated docs in PR description referencing this plan ID
- Update `.cortex/evidence-index.json` with new artefacts before merge

