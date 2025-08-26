# Cortex-OS App Test Suite Audit

Generated: 2025-08-26T20:24:13Z

## Summary Score
| Category | Score |
| --- | --- |
| Coverage | 30% |
| Reliability | 35% |
| Maintainability | 40% |
| **Overall** | **35%** |

## Coverage Gaps
- Packages `mvp`, `agents`, and `mvp-server` are missing from the root Vitest `projects` list, so their tests do not run in CI.
- Within tested packages, critical modules such as `CortexKernel` and `MCPAdapter` lack unit tests for failure paths and edge cases.
- No tests exercise the boot sequence under `apps/cortex-os/src/boot`.

## Brittle Tests
- `packages/mvp/tests/critical-issues.test.ts` and `determinism.test.ts` contain red-phase tests that intentionally fail and rely on live timers and randomness.
- `packages/mvp-server/tests/placeholder.test.ts` provides minimal assertions and should be replaced with meaningful coverage.
- Inconsistent wrapper usage (`kernel.getNeuronCount`) appears in `integration.test.ts`, masking direct orchestrator access.

## Fixture Reuse
- Repeated blueprint and orchestrator mocks across `mvp` tests; extract factory helpers or shared fixtures (e.g., `fixtures/blueprint.ts`).
- Global overrides for `Math.random` and `setTimeout` appear in multiple tests; centralize deterministic helpers.

## Parallel Safety
- Tests mutate global `Math.random` and `setTimeout`, which can leak across parallel workers.
- Missing `vi.useFakeTimers()` and `vi.setSystemTime()` around time-sensitive assertions.

## Snapshot Noise
- No snapshot files detected; snapshot noise is currently not an issue.

## Refactor Plan
1. Add `apps/cortex-os/packages/mvp`, `agents`, and `mvp-server` configs to the root Vitest `projects` array so they run in CI.
2. Split unit, integration, and e2e tests into dedicated directories per package.
3. Convert red-phase tests to `it.fails` or move them under a `spec-failing` directory excluded from CI.
4. Introduce shared fixtures (`createBlueprint`, `createKernel`) and deterministic helpers (`seededMathRandom`, `freezeTime`).
5. Use `vi.useFakeTimers()` and `vi.setSystemTime()` to freeze time and avoid race conditions.
6. Expand coverage on `CortexKernel`, `MCPAdapter`, and boot flow before adding new features.
7. Enforce coverage thresholds through per-package `vitest.config.ts` (added for this app).

## Coverage Thresholds
- Global: statements 80%, branches 80%, functions 80%, lines 80%.
- Per-file: warn when coverage drops below 75%.

## Overall Score
**35/100**

