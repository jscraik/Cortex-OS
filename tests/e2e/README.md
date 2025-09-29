# Cross-Cutting Acceptance Suites

The `tests/e2e` directory captures the cross-cutting acceptance coverage called out in the [final brAInwav Cortex-OS TDD Plan](../../final-cortex-tdd-plan.md). These suites run realistic pipelines without relying on placeholder data and must remain green before any production readiness claims.

## Suites

| Suite | Purpose |
| --- | --- |
| `full-stack/orchestrated-run.spec.ts` | Drives an end-to-end "auth → task → agent → evidence → MCP" pipeline using the real memories store, evidence enhancer, and database executor. |
| `observability.metrics.spec.ts` | Validates Prometheus gauges/counters emit live values after a registry reset and ensures no placeholder tokens survive. |

Supporting utilities live under `tests/e2e/utils/`. New suites should reuse the placeholder guard helpers to keep assertions consistent.

## Running the Acceptance Gate

```bash
pnpm test:full
```

The command wires these suites together with the TODO guard (`tests/security/todo-banned.spec.ts`). Run it locally before pushing to guarantee new debt is caught immediately.
