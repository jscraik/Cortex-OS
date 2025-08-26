# MVP Kernel Audit

_Last updated: 2025-08-26T00:00:00Z_

## Findings

### Boundary to mvp-core
- Kernel sources contain no imports of `@cortex-os/mvp-core`, preventing deep coupling.
- Added contract test to ensure only public exports are used and deep paths are blocked.

### Config via env schema
- Kernel does not currently load configuration through an env schema.
- `@cortex-os/mvp-core` exposes `loadEnv` with a Zod schema but is unused in the kernel.

### Feature flags
- No feature flag mechanism is present; unknown flags would pass silently.

### Error budgets
- State model records errors but no error budget or failure thresholds are enforced.

### OTEL spans
- Kernel performs no OpenTelemetry instrumentation despite helpers in `mvp-core`.

## TDD Plan
1. Contract tests against `mvp-core` public API.
2. End-to-end workflow tests covering happy path and edge cases.
3. CLI snapshot tests via `cortex-cli` for public commands.

## Fix Plan
- Integrate `loadEnv` from `mvp-core` and validate runtime config.
- Introduce feature flag registry that fails closed on unknown flags.
- Track per-phase error budgets and surface when exceeded.
- Wrap workflow phases with `withSpan` for OTEL tracing.

## Scorecard
| Domain | Score | Notes |
| --- | --- | --- |
| Arch | 10/20 | Clean boundaries but missing modular flags |
| Rel | 8/20 | No env schema or error budgets |
| Sec | 5/15 | Flag validation absent |
| Test | 12/25 | Determinism tests exist; contract & CLI tests pending |
| Docs | 4/10 | Lacks user-facing docs |
| A11y | 0/10 | No CLI/UI accessibility work |
| **Total** | **39/100** | Needs improvements to reach 90% readiness |
