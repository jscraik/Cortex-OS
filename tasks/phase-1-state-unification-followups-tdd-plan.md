# phase-1-state-unification-followups-tdd-plan.md

## Implementation Plan

### Phase 1: Strengthen Contract Test
- [x] Update `packages/orchestration/tests/n0-state-alignment.contract.test.ts` to assert that the session payload emitted by the kernel projection includes any optional fields declared in `N0SessionSchema`.
- [x] Add expectations that new context keys (e.g., `thermal`, `delegation`) survive merges across adapters.

### Phase 2: Documentation Update
- [x] Once the stronger assertions are in place, mark the Phase 1 follow-up checkbox in `LANGGRAPH_INTEGRATION_PLAN.md` as complete and reference the regression test.

## Technical Decisions
- Reuse the existing contract test instead of creating a new suite to keep the assertions consolidated.
- Use deterministic fixture data to avoid introducing flaky behaviour.
- Leverage Vitest's `expect` helpers; no additional dependencies are required.
