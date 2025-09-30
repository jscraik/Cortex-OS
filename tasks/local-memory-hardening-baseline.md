# Local-Memory Refactor – Phase 0 Baseline

_Date: September 30, 2025_

## 1. Test Inventory (current state)

| Area | Package | Primary command | Notes |
|------|---------|-----------------|-------|
| Memory adapters & stores | `@cortex-os/memories` | `pnpm --filter @cortex-os/memories test` | Uses `scripts/vitest-safe.mjs` wrapper; mixes unit/integration tests for pooling, cache, circuit breaker, CLI utilities. Heavy SQLite usage and long-running async behaviour. |
| Memory core engine | `@cortex-os/memory-core` | `pnpm --filter @cortex-os/memory-core test` (Vitest) | No project config – Vitest currently errors because it looks for `vitest.basic.config.ts`. Tests are effectively disabled. |
| MCP adapter | `@cortex-os/mcp-server` | `pnpm --filter @cortex-os/mcp-server test` | Vitest also references missing `vitest.basic.config.ts` project file; suite never starts. |
| Local-Memory app | `@cortex-os/local-memory` | `pnpm --filter @cortex-os/local-memory test` | Contains OAuth, telemetry, and license manager specs. Several license specs rely on 1Password CLI and fail locally. |
| Parity / integration | `@cortex-os/testing` (parity suite) | `pnpm --filter @cortex-os/testing test -- --project parity` | **Not run** yet – requires working MCP HTTP+STDIO stack. |
| REST smoke | `@cortex-os/testing` (integration suite) | `pnpm --filter @cortex-os/testing test -- --project integration` | **Not run** yet – depends on runnable docker stack. |

## 2. Smoke Test Results (2025-09-30)

### `@cortex-os/memories`
- Command timed out after ~7 minutes.
- Massive Vitest run (`pool=forks`, `maxWorkers=1`).
- Multiple timeouts in connection-pool and cache specs (30s each).
- Out-of-memory crash (`Allocation failed - JavaScript heap out of memory`).
- Exit status: timeout (pnpm code 124).

### `@cortex-os/memory-core`
- Immediate Vitest startup error: missing `vitest.basic.config.ts` referenced in projects definition.
- No tests executed.
- Exit status: 1.

### `@cortex-os/mcp-server`
- Same Vitest startup error (missing `vitest.basic.config.ts`).
- No tests executed.
- Exit status: 1.

### `@cortex-os/local-memory`
- Vitest suite starts; telemetry and auth tests pass.
- License manager specs fail due to missing 1Password CLI stubs and improper mocks (timeouts, unexpected errors, wrong expectations).
- Exit status: 1.

## 3. Acceptance Notes (current behaviour)

- **MCP parity**: The dedicated parity suite in `packages/testing` assumes functioning STDIO + HTTP transports. Because the MCP server still runs off the in-process provider and unit tests do not run, there is no automated parity guarantee today.
- **REST smoke**: No automated smoke has been executed in this baseline run. Existing docs reference compose stacks where `cortex-mcp` talks directly to SQLite/Qdrant. There is no health signal for a standalone Local-Memory service yet.
- **Docker compose**: `docker/memory-stack/docker-compose.yml` currently builds `cortex-mcp` and `cortex-rest-api` against the monorepo source; it does not reference a published Local-Memory service image. Bringing the stack up without prior builds fails because the TypeScript packages emit nothing.

## 4. Gaps vs. Target Architecture

- Tests for `memory-core` and `mcp-server` are effectively **non-existent** due to vitest config errors.
- `@cortex-os/memories` suite is unstable and too heavy to serve as a regression detector.
- No automated checks cover MCP HTTP/STDIO parity or REST compatibility in CI.
- Docker stack is not aligned with the future Local-Memory service layer; health endpoints are unverified.

## 5. TODO Matrix

| ID | Task | Owner | Status | Notes |
|----|------|-------|--------|-------|
| T0-1 | Fix Vitest configuration for `memory-core` and `mcp-server` (provide project configs or update references). | TBD | ❌ | Blocks any future unit tests. |
| T0-2 | Stabilize `@cortex-os/memories` suite (reduce timeouts, memory usage, or skip flaky specs) to obtain actionable signal. | TBD | ❌ | Needed before refactoring adapters. |
| T0-3 | Extract or create lightweight Local-Memory service package with its own tests; ensure `pnpm --filter local-memory-service build/test` succeeds. | TBD | ❌ | Prerequisite for transport parity. |
| T0-4 | Define and enable MCP parity + REST smoke jobs (likely via `@cortex-os/testing` projects). | TBD | ❌ | Must run after service is buildable. |
| T0-5 | Update docker stack to include the Local-Memory service and document health expectations. | TBD | ❌ | Required for acceptance. |

## 6. Immediate Risks

1. **Test infrastructure debt** – Without working unit tests in `memory-core`/`mcp-server`, regressions will go unnoticed during the refactor.
2. **Resource constraints** – Long-running memory store tests currently exceed available heap; we need to trim or isolate them before repeated runs.
3. **External tooling dependencies** – License/OAuth specs assume tooling (1Password CLI, valid keys). These should be mocked or marked as integration tests.

---
This baseline captures the current gaps before tackling Phase 1. Use it as the starting checkpoint for the upcoming TDD work.
