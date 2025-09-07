# Orchestration Package Development Plan

This document details a TDD-driven roadmap to bring `packages/orchestration` to operational readiness. Each task follows strict software engineering practices: red-green-refactor, micro-commits, and Conventional Commits.

## Guiding Principles

- **TDD:** start with failing tests, implement minimal code, refactor once green.
- **Micro-commits:** one focused change per commit including tests and code.
- **Conventional Commits:** e.g., `feat(orchestration): support branch steps`.
- **Validation:** `pre-commit run --files <changed>` and `pnpm lint && pnpm test` for code; `pnpm docs:lint` for docs.

## Milestone 0 – Harden Existing Features

1. **Deterministic pipelines**
   - _Test:_ validate DAG validator rejects cycles.
   - _Impl:_ ensure topological sort enforces order.
   - _Commit cadence:_ `test(orchestration): add DAG cycle coverage` → `feat(orchestration): enforce topological sort` → `refactor(orchestration): clean up validator`.
2. **Sequential/parallel execution**
   - _Test:_ simulate concurrent steps; ensure ordering and isolation.
   - _Impl:_ refine scheduler to cap concurrency and handle errors.
3. **Timeouts & retries**
   - _Test:_ cover per-step timeout and retry policies.
   - _Impl:_ strengthen backoff logic and deadline propagation.

## Milestone 1 – Conditional Branching

1. Add failing tests for `branch` step routing.
2. Implement branch executor respecting condition predicates.
3. Refactor and document branching semantics.

## Milestone 2 – Loop/Map Semantics

1. Add failing tests for iterative `map` steps and loop termination.
2. Implement loop controller with index & accumulator support.
3. Refactor for readability and performance.

## Milestone 3 – Hooks System

1. Define test cases for pre/post step hooks and workflow-level hooks.
2. Implement hook registration and execution pipeline.
3. Document hook API and examples.

## Milestone 4 – Pure Runners

1. Introduce tests enforcing purity (no side effects) via mocked I/O.
2. Refactor runners to accept dependencies and emit effects separately.
3. Provide guidelines for effect handling.

## Milestone 5 – Compensation Actions

1. Write failing tests demonstrating rollback on step failure.
2. Implement compensation DSL and executor with idempotency checks.
3. Add documentation and examples.

## Milestone 6 – Cancellation

1. Tests to ensure `AbortSignal` cancels in-flight steps and propagates.
2. Implement cancellation middleware and cleanup handlers.
3. Update documentation.

## Milestone 7 – Typed DSL Builder

1. Create tests for type-safe workflow composition and inference.
2. Implement builder utilities wrapping Zod schemas.
3. Refactor examples to use typed DSL and document patterns.

## Milestone 8 – Documentation & Examples

1. Add comprehensive README updates and usage examples.
2. Ensure all public APIs are documented with JSDoc/TSdoc.
3. Create tutorial covering advanced features (hooks, compensation, cancel).

## Operational Readiness Checklist

- [ ] 100% test coverage on workflow execution paths.
- [ ] Lint, type-check, and tests integrated in CI.
- [ ] Benchmarks for sequential vs parallel throughput.
- [ ] Security review of hook and compensation mechanisms.

Each milestone should conclude with green CI and tagged release candidate.
