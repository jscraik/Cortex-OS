# master-agent-execution.research.md

## Research Objective

Prepare Phase 5 deliverables for brAInwav master agent execution and health validation:

- Replace placeholder-based assertions in `packages/services/orchestration/tests/master-agent.exec.spec.ts` with dispatch-level instrumentation
- Boot the orchestration LangGraph harness and verify node logging semantics
- Confirm health metrics source live pool counts rather than static values
- Guard orchestration adapter fallbacks and retries inside `packages/orchestration`

## Repository Findings (2025-09-27)

### Master Agent Graph (packages/agents)

- `packages/agents/src/MasterAgent.ts` exports `createMasterAgentGraph`
  - `toolLayer` composes conversation array and builds tool jobs via `buildToolJobs`
  - Uses `createMLXAdapter` / `createOllamaAdapter` and `dispatchTools(jobs, { session, hooks, budget, concurrency: 1 })`
  - Job metadata includes provider tags (`mlx`, `ollama`) and deterministic traceId via `randomUUID`
  - Outcome attaches AIMessage to LangGraph state with `result.execution.provider`
- Opportunity: mock `dispatchTools` to capture job lists, simulate fulfilled dispatch responses,
  and spy on MLX/Ollama adapters to guarantee availability toggles

### LangGraph Harness Logging (services orchestration)

- `packages/services/orchestration/src/lib/executor.ts` + `HookManager`
  - Hooks emit `console.warn` with step identifiers (`commonHooks.logStepStart`, `logStepComplete`, `recordStepMetrics`)
  - Workflow run integrates hooks via `workflow.hooks` and triggers events on node execution, cancellation, and errors
- Approach: instantiate `HookManager`, register `commonHooks`, execute a minimal workflow with `run()`,
  and confirm console output includes node identifiers plus brAInwav context.
  We can ensure brand inclusion by seeding metadata or verifying we add the brand ourselves

### Health Metrics (AgentHealthMonitor)

- `packages/services/orchestration/src/lib/agent-health-monitor.ts`
  - Maintains `healthMetrics` map with live counts (`totalRequests`, `totalFailures`, `consecutiveFailures`)
  - `getSystemHealthSummary()` returns counts for `healthy`, `degraded`, `unhealthy`, `offline`
  - `performHealthChecks()` uses `pingAgent` (with env-based endpoint) and `recordAgentActivity`
- Gap: existing test `tests/health/pool-health.spec.ts` only spies on `Math.random`
- Plan: simulate activity across multiple agents, ensure `getSystemHealthSummary().healthy`
  equals registered healthy agents, and degrade one agent to verify counts adjust without
  referencing static numbers

### Adapter Fallbacks & Retries (packages/orchestration)

- `packages/orchestration/src/providers/composite-provider.ts`
  - `CompositeModelProvider.executeWithFallback` iterates configured providers, honors `provider.isAvailable()` and fallback timeout
  - Emits events: `provider-skipped`, `provider-failed`, `provider-success`
  - Validates providers via `CircuitBreaker` wrappers; ensures attempt count returned from fallback aggregator
  - `generateChat`, `generateEmbeddings`, `rerank` all delegate through fallback pipeline
- Test focus: configure two fake providers (first fails, second succeeds), ensure fallback triggers
  success and event ordering, verify the attempts count increments, and confirm an error
  propagates when none succeed

### Test Infrastructure Notes

- `packages/services/orchestration/package.json` uses `node ../../../scripts/vitest-safe.mjs run`;
  tests under `tests/**` currently execute via the safe runner despite local `vitest.config.ts`
- Root `vitest.workspace.ts` does **not** include `@cortex-os/service-orchestration`; use the
  package-specific runner (`pnpm --filter @cortex-os/service-orchestration test`)
- Hooks logging uses `console.warn`; wrap `vi.spyOn(console, 'warn')`

## External References

- LangGraphJS `StateGraph` API already used in `createMasterAgentGraph` (rooted in LangGraph plan); no additional docs accessed this session.

## Risks & Considerations

- Ensure tests maintain ≤20s execution per workspace defaults; avoid real network fetches by stubbing adapters and fetch
- `fetch` may be undefined in the Node 18 test runtime. AgentHealthMonitor uses `fetch` when an
  endpoint is defined—stay on the in-memory path to avoid network usage
- Guarantee all synthetic logs include `brAInwav` branding either by seeding metadata or by asserting dispatch jobs produce brand-labeled errors/responses
- Use `vi.mock` carefully with ESM modules; prefer `vi.hoisted` + dynamic `import()` to ensure mocks apply before module evaluation

## Next Steps

1. Draft TDD plan outlining failing tests to add/expand for each requirement
2. Implement test suites with deterministic spies/mocks and brand-compliant assertions
3. Run targeted Vitest packages plus smart Nx filters to validate changes
