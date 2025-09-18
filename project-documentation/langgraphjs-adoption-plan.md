# LangGraphJS Adoption Plan for Cortex-OS

Goal: Replace PRP-focused orchestration – specifically the `@cortex-os/prp-runner` package and its consumers –
with a LangGraphJS runtime that coordinates Voltage agents, MLX-first model routing, and the Cerebrum persona
architecture. Each step follows strict TDD and produces a single committable change. We source the runtime from
`https://github.com/langchain-ai/langgraphjs.git`, pinning to a vetted commit via workspace git dependency metadata
and updating it deliberately.

Current Status (live):

- Phase 0: Completed (exports snapshots, readiness docs/spec).
- Phase 1: Shared Model Registry implemented with Zod schemas, validation in place.
- Phase 2: Runtime skeleton in place: `createCerebrumGraph()` foundation, persona loader,
  guard (structured policy compliance for a11y/security), model selection, executor with OTEL span;
  tests added for guard (positive/negative), selection, and harness.

Next focus:

- Emit A2A audit events for guard pass/fail and model selection; attach trace attributes.
- Add initial tool/agent node consuming `selectedModel` with streaming; wire MLX-first and Ollama fallback with
   health-check placeholders.
- Expand policy enforcement to structured schemas across personas.

## Phase 0 – Foundations (2 commits)

1. **Repository Health Baseline**
   - Tests first: create failing snapshot verifying current exports for `@cortex-os/orchestration` and `@cortex-os/prp-runner`.
   - Implementation: no functional change; ensures guard rails remain during refactor.
2. **Environment & Readiness Docs**
   - Tests: lint/docs check expecting `project-documentation/langgraph-readiness.md`.
   - Implementation: document required services (MLX @ 8765, Ollama @ 11434, Frontier) and personas; add validation script.
3. **LangGraphJS Dependency Pinning**
   - Tests: workspace validation (lint or custom script) fails until `langgraph` resolves from `https://github.com/langchain-ai/langgraphjs.git#<commit>`.
   - Implementation: add git dependency to root `package.json`, configure pnpm overrides for reproducibility, and document upgrade workflow.

## Phase 1 – Shared Model Registry (3 commits)

1. **Config Loader Skeleton**
   - Tests: failing unit tests that call `loadModelRegistry()` to load `config/mlx-models.json` and `config/ollama-models.json`.
   - Implementation: build the loader with zod validation and path resolution.
2. **Model Provider Refactor**
   - Tests: ensure `MLXFirstModelProvider.generate()` respects registry output (prefers MLX, falls back to Ollama).
   - Implementation: remove `MODEL_STRATEGY`, wire loader into provider.
3. **Cross-Package Consumption**
   - Tests: update agents + orchestration tests to rely on shared loader outputs.
   - Implementation: export registry utils from `@cortex-os/model-gateway` (or new shared module) and replace hard-coded mappings in other packages.

## Phase 2 – LangGraphJS Runtime Skeleton (3 commits)

1. **Graph Factory**
   - Tests: snapshot of nodes/edges built by `createCerebrumGraph()` fails until implemented.
   - Implementation: build LangGraphJS graph skeleton aligned with the architecture diagram
     (Master loop, h2a queue, ToolEngine) using primitives imported from the git-sourced `langgraph` package.
2. **Persona Integration**
   - Tests: persona rules from `cerebrum.yaml` enforced via middleware; fail until guard nodes exist.
   - Implementation: load YAML, create guard nodes (WCAG, security) wrapping relevant graph transitions.
3. **Executor Service**
   - Tests: integration test running a simple workflow through the graph (should fail before implementation).
   - Implementation: create `LangGraphExecutor` (start/run/shutdown) emitting telemetry/audit events.

## Phase 3 – Tool Layer & Voltage Adapters (5 commits)

1. **Filesystem Tools (View/List/Glob, Grep, Write/Replace)**
   - Tests: TDD each tool node ensuring real filesystem operations with sandbox mocks.
   - Implementation: wrap existing CLI commands in LangGraph tool nodes.
2. **Patch & Todo Planning**
   - Tests: confirm edit/patch nodes apply diffs; todo planner outputs follow spec.
   - Implementation: adapt current `EditTool`, `BatchTool`, `TodoWrite` into LangGraph nodes.
3. **Sub-Agent Dispatcher**
   - Tests: simulation verifying `dispatch_agent` spins up voltage sub-agents with typed dependencies.
   - Implementation: create adapter bridging LangGraph node to `@cortex-os/agents` registry.
4. **Shell & WebFetch**
   - Tests: ensure sandbox enforcement (no network without allowlist, persistent shell works).
   - Implementation: implement bash + web-fetch nodes with security wrappers.
5. **Stream/Compressor/Memory Integration**
   - Tests: confirm streaming output, compressor triggers, and logs persist to memory store.
   - Implementation: connect `StreamGen`, `Compressor W42`, `CLAUDE.md`, and message history per diagram.

## Phase 4 – Persona & Sub-Agent Playbooks (3 commits)

1. **Persona Dependency Injection**
   - Tests: each persona node receives `ArchonDependencies`-style metadata (request id, trace id).
   - Implementation: port rate limiting & progress callbacks from Archon base agent pattern.
2. **Structured Outputs & Context Sharing**
   - Tests: persona nodes must emit `success/message/data/errors` structures used by PRP generator.
   - Implementation: wrap voltage personas to conform to standard schema.
3. **Sub-Agent Templates**
   - Tests: ensure implementation persona publishes task YAML matching PRPs-agentic-eng template; failing until adopted.
   - Implementation: update persona prompts + output processors.

## Phase 5 – PRP Generation & Blueprint Refresh (3 commits)

1. **Blueprint Template Modernization**
   - Tests: validate `feature-blueprint.md` includes required sections (context completeness, desired tree, gotchas).
   - Implementation: update template and persona prompts to fill new sections.
2. **PRP Generator Alignment**
   - Tests: PRP generation uses `prp_base.yaml` and new persona outputs; create golden-file test.
   - Implementation: rework generator to assemble structured outputs into final `prp.md`.
3. **Security & Deployment Passes**
   - Tests: ensure security/devops agents run after main loop and produce required data (checklist in test).
   - Implementation: add final loop nodes for security/deployment sign-off.

## Phase 6 – Removing Legacy PRP Runner (2 commits)

1. **Swap Orchestration API**
   - Tests: update existing orchestrator specs to expect LangGraph executor.
   - Implementation: `provideOrchestration` now instantiates LangGraph runtime; PRP runner becomes adapter.
2. **Deprecate PRP-Orchestrator Internals**
   - Tests: ensure removed exports throw descriptive errors if used.
   - Implementation: delete PRP-specific logic; update README/readiness metrics.

## Phase 7 – Hardening & Release (3 commits)

1. **End-to-End Scenario Test**
   - Tests: run a full blueprint through the graph to produce a PRP; ensures pipeline works with real MLX/Ollama.
   - Implementation: create e2e harness under `packages/orchestration/tests/e2e`.
2. **Operational Instrumentation**
   - Tests: verify audit + OTEL events appear per node (unit tests on emitter hooks).
   - Implementation: connect graph events to observability package.
3. **Readiness & Docs**
   - Tests: `readiness.yml` thresholds enforced via CI; failing until metrics set.
   - Implementation: update docs (`orchestration-langgraph-refactor-plan.md`, persona playbooks, PRP templates) and readiness scores.

## Working Agreements

- Write failing tests before each implementation.
- Keep commits focused: tests + implementation (plus docs) per change.
- Run `pnpm lint:smart`, `pnpm test:smart`, `pnpm typecheck:smart` before merging.
- Ensure MLX/Ollama/Frontier services are running locally during integration/e2e phases.
