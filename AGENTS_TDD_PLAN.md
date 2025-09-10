# Agents Package Technical Review and TDD Plan

## Technical Review Summary
- Package offers multi-framework agent execution with governed memory, observability, and deterministic behavior features.
- Utility layer imports `secureId` from an undeclared dependency, preventing test execution.
- Automated test suite fails: missing event samples, invalid validation helpers, and missing package dependencies.

## Software Engineering Principle
**Agents must remain deterministic and interface-driven, with all external dependencies explicitly declared and every public behavior backed by contract, unit, integration, and end-to-end tests executed via strict TDD.**

## TDD Implementation Plan
| # | Task | Test-First Step | Implementation Step | Commit Message |
|---|------|-----------------|---------------------|----------------|
|1|Declare `@cortex-os/utils` dependency and secure ID generation|Add failing unit tests for `generateAgentId`/`generateTraceId` requiring `secureId`|Add dependency in `package.json` and ensure utilities delegate to workspace module|`feat(agents): add workspace utils dependency`|
|2|Align validation utilities with functional API|Write failing tests asserting `createValidator` returns callable validator and `ValidationError` is constructible|Refactor `createValidator` to return function, export `ValidationError` correctly|`fix(agents): standardize validation utilities`|
|3|Provide event sample for `security.workflow_unauthorized`|Add failing contract test expecting sample payload in `agentEventCatalog`|Add fixture and update catalog to include sample|`feat(agents): document unauthorized workflow event`|
|4|Enforce CloudEvent spec version in contracts|Write failing test verifying `specversion` equals `"1.0"`|Adjust schema parsing to require exact spec version|`fix(agents): validate CloudEvent spec version`|
|5|Harden timestamp validation|Add failing test ensuring `agent.started` timestamps pass ISO-8601 checks|Refine schema to parse/validate timestamps correctly|`fix(agents): enforce ISO-8601 event timestamps`|
|6|Verify documentation agent input/output schemas|Add failing unit tests for `DocumentationAgent` validation paths|Implement/adjust schema definitions and handlers|`feat(agents): validate documentation agent payloads`|
|7|Smoke-test security agent fallback logic|Add failing integration test for risky content flagged via fallback parser|Implement fallback handling and ensure event bus emits `agent.failed`|`feat(agents): support security fallback evaluation`|
|8|Track coverage threshold|Write failing coverage test enforcing ≥90% statements|Optimize tests/implementation to meet threshold|`chore(agents): enforce coverage threshold`|

## Testing
- ⚠️ `pnpm -F @cortex-os/agents test` (fails due to missing dependency and contract mismatches)

## Notes
- Ensure each task follows TDD: write failing test, implement fix, re-run `pnpm lint` and `pnpm test` before commit.
- Address remaining failed suites iteratively to reach operational readiness.
