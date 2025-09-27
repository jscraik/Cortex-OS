# master-agent-execution-tdd-plan.md

## Overview

Goal: deliver Phase 5 coverage for brAInwav master agent execution and health. We will drive development by
first authoring failing tests, then iterating toward green implementations.

## Test-Driven Plan

### 1. Dispatch instrumentation

- Add failing test in `packages/services/orchestration/tests/master-agent.exec.spec.ts` asserting that
  `dispatchTools` is invoked with a job list containing provider metadata and that spies capture calls to the
  MLX and Ollama adapters.
- Replace placeholder assertion checking for mock strings with expectations verifying the spy call order and
  the brAInwav-branded dispatch response.
- Ensure the test fails initially by asserting spy counts before wiring the new instrumentation.

### 2. LangGraph harness logging

- Introduce or expand an integration spec under `packages/services/orchestration/tests/integration` that boots
  the LangGraph harness through `HookManager` and `commonHooks`.
- Add failing expectation that `console.warn` receives messages containing node ids plus "brAInwav" branding.
- Ensure the workflow completes without touching remote services by using minimal graph fixtures from
  `createMasterAgentGraph`.

### 3. Live agent health metrics

- Update `tests/health/pool-health.spec.ts` to register multiple agents via `AgentHealthMonitor`, drive activity
  with `recordAgentActivity`, and assert `getSystemHealthSummary()` returns actual healthy counts.
- Add failing expectation confirming that downgrading one agent via `recordAgentFailure` transitions metrics to
  `degraded` without referencing `Math.random`.

### 4. Fallback and retry protection

- Create or extend a vitest suite (e.g., `tests/stability/composite-provider.spec.ts`) that configures two fake
  providers such that the first fails and the second succeeds.
- Author failing expectations on event ordering (`provider-failed` firing before `provider-success`), attempt
  count increments, and error propagation when all providers fail.
- Include assertions that emitted telemetry strings contain "brAInwav" branding.

## Implementation Checklist

- [ ] Instrument `dispatchTools` usage with spies and replace mock-based expectations.
- [ ] Capture LangGraph console output via `HookManager` and assert branded node logs.
- [ ] Drive `AgentHealthMonitor` with deterministic activity to validate live counts.
- [ ] Cover composite provider fallback scenarios with both success and failure paths.
- [ ] Maintain ≤ 40 line functions and named exports while integrating new helpers.
- [ ] Run `pnpm --filter @cortex-os/service-orchestration test` until green.
- [ ] Document learnings and archive TDD artefacts once all checks pass.
