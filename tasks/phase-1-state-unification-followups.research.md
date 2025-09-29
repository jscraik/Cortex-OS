# phase-1-state-unification-followups.research.md

## Research Objective
Document current cross-package `N0State` alignment guarantees and identify what work remains to satisfy the Phase 1 follow-up in the LangGraph integration plan.

## Existing Patterns Found
- `packages/orchestration/src/langgraph/n0-state.ts` defines the canonical `N0State` Zod schema used by orchestration.
- `packages/orchestration/src/langgraph/n0-adapters.ts` adapts agent, Cortex, and workflow states into the canonical schema.
- `packages/kernel/src/kernel.ts` exposes `projectKernelWorkflowToN0`, projecting kernel workflow state into the shared schema.
- `packages/orchestration/tests/n0-state-alignment.contract.test.ts` already asserts shape parity between outputs from the adapters and the kernel projection.
- `packages/agents/tests/unit/n0-shim.integration.test.ts` verifies the agent shim resolves model gateway adapters while maintaining `N0State` compatibility.

## External Research
- None required; the follow-up is fully covered by internal implementation and tests.

## Recommendations
- Extend the contract test to assert that newly added session fields propagate across adapters, guaranteeing immediate failures if a package diverges.
- Update `LANGGRAPH_INTEGRATION_PLAN.md` to mark the Phase 1 follow-up as complete once the stronger assertions are in place.
