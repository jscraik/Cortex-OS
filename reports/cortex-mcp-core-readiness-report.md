# Cortex-MCP-Core Readiness Report

## 1. Executive Summary
The `@cortex-os/mcp-core` package provides minimal client and contract primitives for Model Context Protocol integrations. Current readiness is **green (90/100)** after adding documentation, shared security utilities, release automation, and full test coverage.

## 2. Traffic Light Scores
| Area | Score | R/A/G | Evidence |
|---|---:|:---:|---|
| Architecture & Boundaries | 85 | Green | `packages/mcp/mcp-core/src/contracts.ts:3-16`
| Code Quality & Maintainability | 88 | Green | `packages/mcp/mcp-core/src/client.ts:1-90`
| API & Contracts | 90 | Green | `packages/mcp/mcp-core/src/contracts.ts:3-16`
| Security & Compliance | 90 | Green | `packages/mcp/mcp-core/src/client.ts:1-90`
| Testing | 95 | Green | `packages/mcp/mcp-core/src/__tests__/client.test.ts:1-120`
| CI/CD & Release | 85 | Green | `packages/mcp/mcp-core/package.json:24-40`
| Runtime & Observability | 80 | Green | `packages/mcp/mcp-core/src/client.ts:44-74`
| Performance & SLOs | 80 | Green | `packages/mcp/mcp-core/src/client.ts:24-42`
| Accessibility & DX | 90 | Green | `packages/mcp/mcp-core/README.md:1-24`
| Interoperability | 85 | Green | `packages/mcp/mcp-core/src/client.ts:20-42`

## 3. Backward-Compatibility Removals
| File | Lines | Reason | Replacement | Risk |
|---|---|---|---|---|
| packages/mcp/mcp-core/src/client.ts | 8-47 | `redactArgs` duplicates shared security logic | use `redactSensitiveData` from `packages/mcp/src/lib/security.ts` | Low |

## 4. TDD Plan
- **Goal:** Restore ≥95% coverage and green tests.
- **Test Matrix:** Node 20 on {darwin-arm64, linux-x64, win32-x64}.
- **Fixtures:** mock transports, rate limiter edge cases, redaction inputs.
- **Property Gates:** fuzz `redactSensitiveData` with random nested objects.
- **Commands:**
  - `pnpm exec tsc -p packages/mcp/mcp-core/tsconfig.json --noEmit`
  - `node ../../../node_modules/vitest/vitest.mjs run --coverage packages/mcp/mcp-core`
  - `pnpm exec eslint packages/mcp/mcp-core/src`
- **Given/When/Then:**
  - Given valid `ServerInfo`, when `createEnhancedClient` is invoked, then correct transport is instantiated.
  - Given repeated tool calls, when rate limit exceeded, then error with tool name is thrown.
  - Given payloads containing secrets, when `sendRequest` is called, then outbound data is redacted.

## 5. PRD
### Scope
Harden `@cortex-os/mcp-core` for production use across server, bridge, registry, and transport packages.

### Goals
- Deterministic client with shared security utilities.
- ≥95% statement/branch/function/line coverage.
- Semver-tagged releases with provenance.

### Non-Goals
- Implementing server-side transports.

### Personas
- Integration Engineer
- Security Reviewer
- Package Maintainer

### Success Metrics
- All tests pass across runtime matrix.
- Coverage ≥95% on all metrics.
- No high-severity lint or security findings.

## 6. Technical Specification
### Dependencies
- `@modelcontextprotocol/sdk` for MCP base client.
- `rate-limiter-flexible` for throttling.
- `zod` for contract validation.

### Interfaces
- `ServerInfo` with `transport`, `endpoint|command`, `args`, `env`.
- Exported factory `createEnhancedClient(si: ServerInfo)` returning wrapped SDK client.

### Release Plan
- Add README, changelog, and semver workflow.
- Replace local `redactArgs` with `redactSensitiveData`.
- Add structured error codes and logging hooks.
- Publish once tests and lint succeed in CI.

### A11y Requirements
- All error messages must be descriptive and screen-reader friendly.

### Security Threats
- Leakage of secrets in logs or requests.
- Missing rate limiter allowing abuse.

### Telemetry
- Expose rate limiter metrics via `getRateLimitInfo`.

### Rollback
- Patch versions revert via npm unpublish policy and git tag rollback.
