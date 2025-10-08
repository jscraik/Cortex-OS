# Kernel LangGraphJS Adoption Plan

Goal: Rebuild `@cortex-os/kernel` as the deterministic execution core for LangGraphJS-based workflows, aligning with the agents/orchestration/prp-runner refactors. Each stage follows strict TDD, keeps commits small, and ensures main stays releasable.

## Phase 0 – Baseline & Guardrails (2 commits)
1. **Snapshot Current Surface**
   - Tests: add failing snapshot test covering current exports (`index.ts`, MCP adapter) so regressions are caught.
   - Implementation: no functional change; just the test and snapshot update.
2. **Readiness Scaffold**
   - Tests: introduce failing lint/docs check requiring `project-documentation/kernel-readiness.md` + non-zero thresholds in `readiness.yml`.
   - Implementation: document runtime prerequisites (MLX, Ollama, Frontier), LangGraph prerequisites, and update readiness thresholds (e.g., 80% statements, 70% branches).

## Phase 1 – LangGraph Graph Definition (3 commits)
1. **Graph Schema Skeleton**
   - Tests: create failing unit spec for `createKernelGraph()` verifying nodes/edges (strategy ↔ build ↔ evaluation, checkpoints).
   - Implementation: build scaffolding that returns an empty LangGraph graph object.
2. **State Integration**
   - Tests: failing tests ensuring graph nodes consume/emit `PRPState` objects and enforce `validateStateTransition`.
   - Implementation: wire state getters/setters into graph context.
3. **History & Checkpoint Storage**
   - Tests: verify graph emits history entries via the existing `history` helpers.
   - Implementation: hook graph transitions to `createHistory/addToHistory` and limit history length (configurable).

## Phase 2 – Sub-agent Execution Bridge (3 commits)
1. **Orchestrator Adapter**
   - Tests: failing integration test asserting `KernelRuntime` calls `orchestrator.executePRPCycle()` with blueprint + sub-agents.
   - Implementation: build adapter bridging LangGraph nodes to orchestrator sub-agents; remove hardcoded validation results.
2. **Voltage Agent Dispatch Hook**
   - Tests: ensures LangGraph nodes emit tasks that orchestration/agents can subscribe to; failing until implemented.
   - Implementation: publish events (via kernel event bus) for strategy/build/evaluation nodes, allowing orchestration to attach agent runners.
3. **Error & Recycle Handling**
   - Tests: forced failure path ensures kernel returns to `strategy` phase and records error evidence.
   - Implementation: implement error boundaries around node execution respecting deterministic timestamps.

## Phase 3 – MCP Tooling Hardening (3 commits)
1. **Tool Registry Refactor**
   - Tests: failing unit tests verifying MCP tools pull from shared registry (reuse orchestration’s `model-catalog` loader) and enforce allowlists.
   - Implementation: migrate to centralized tool definitions, removing ad-hoc shell commands.
2. **Sandbox Enforcement**
   - Tests: attempt disallowed command/network access; expect kernel to throw.
   - Implementation: wire MCP adapter to sandbox utilities (filesystem isolation, network guard, bash tool node from orchestration).
3. **Telemetry + Evidence**
   - Tests: confirm each tool execution records structured evidence and OTEL spans.
   - Implementation: integrate with `packages/observability` event emitters.

## Phase 4 – Kernel Runtime API (2 commits)
1. **LangGraphRunner Wrapper**
   - Tests: integration spec ensuring `createKernel()` returns a runtime with `run()` and `getExecutionHistory()` hitting the LangGraph executor.
   - Implementation: replace the current `CortexKernel` implementation with LangGraph-backed runner while preserving public API.
2. **Deprecate Legacy State Machine**
   - Tests: ensure using deprecated methods logs warnings or throws descriptive errors.
   - Implementation: delete `graph-simple.ts` / `stateMachine` internals once tests pass; update docs.

## Phase 5 – End-to-End Validation (3 commits)
1. **Full Workflow Test**
   - Tests: run a blueprint through kernel + mocked orchestrator + agents to produce a completed PRP.
   - Implementation: integration harness with fixtures under `tests/kernel-e2e`.
2. **Determinism & Replay**
   - Tests: deterministic flag yields identical PRPState/histories across runs.
   - Implementation: ensure LangGraph execution respects fixed timestamps and seeded ids.
3. **Teaching Layer Hooks**
   - Tests: validate `BehaviorExtensionManager` and `ExampleCaptureSystem` capture LangGraph execution events.
   - Implementation: tap into graph event stream and enrich teaching subsystem.

## Phase 6 – Documentation & Release (2 commits)
1. **Docs + Examples Update**
   - Tests: doc lint test expecting updated examples in `docs/` and `examples/` to use the new API.
   - Implementation: refresh README, examples, and developer migration guide explaining new runtime.
2. **Readiness Validation**
   - Tests: enforce coverage thresholds and gating scripts (`pnpm lint:smart`, `pnpm test:smart`, `pnpm typecheck:smart`).
   - Implementation: finalize `readiness.yml`, add CI checks, and update release notes.

## Working Agreements
- Always write failing tests first before implementation.
- Keep commits scoped to a single logical change (tests + code + docs).
- Run smart scripts locally before pushing.
- Ensure MLX/Ollama/Frontier services are available for integration/e2e phases.
- Coordinate with orchestration/prp-runner teams so kernel schema changes land before dependent refactors.

