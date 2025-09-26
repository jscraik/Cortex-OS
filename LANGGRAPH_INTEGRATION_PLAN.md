# LangGraph Integration Plan – TDD Roadmap for n0 Master Agent Loop

<!-- markdownlint-disable MD013 -->

## Objective

Drive the Cortex-OS LangGraph migration through **state unification → tool dispatch → spool orchestration → streaming integration → thermal coordination → multi-agent coordination → production readiness**, leveraging existing mature components instead of rebuilding from scratch. This plan merges the remaining action items in `final-cortex-tdd-plan.md` and `cortex-enhancement-tdd-plan.md`, aligns them with the current codebase, and sequences every task around strict TDD.

The expanded plan now includes **4 critical new phases** that address production-ready LangGraph integration:

- **Real-time streaming** for workflow updates and UI integration
- **Thermal-aware orchestration** that responds to MLX hardware constraints  
- **Multi-agent coordination** patterns for complex distributed workflows
- **Comprehensive integration testing** that validates all system interactions

Each phase documents:

1. **Failing test(s) to author first** (exact file paths with current status)
2. **Implementation pairing** (code required to turn tests green)
3. **Validation hooks** (commands/checks to keep regressions out)
4. **Blockers / accuracy notes** (ground-truth facts from today's repo)

## Current State Snapshot (2025-09-26)

- ✅ Shared `N0State` schema (`packages/orchestration/src/langgraph/n0-state.ts`) and adapters (`n0-adapters.ts`) exist with passing coverage in `packages/orchestration/tests/n0-state-contract.test.ts`
- ✅ Kernel projection shim is exercised by `packages/kernel/tests/n0-projection.test.ts`
- ✅ `packages/agents/tests/unit/n0-shim.integration.test.ts` now passes with the Vitest alias + shim for `@cortex-os/model-gateway`
- ✅ Tool dispatch and spool implementations (`tool-dispatch.ts`, `spool.ts`) now ship with regression coverage for budgets, hooks, and allow-lists
- ✅ `pnpm --filter @cortex-os/agents typecheck` and `pnpm --filter @cortex-os/orchestration typecheck` both pass after slimming the orchestration surface to LangGraph-only modules
- ✅ cortex-py thermal monitoring with brAInwav branding active and emitting A2A events
- ✅ Placeholder regression guard (`tests/regression/placeholders.spec.ts`) and branded random ban (`tests/regression/math-random-ban.spec.ts`) are green with the 135-hit legacy baseline
- ⚠️ Slash command runner lives in `packages/commands/src/index.ts`; no end-to-end tests ensure `/help`, `/agents`, `/model`, `/compact` short-circuit LangGraph
- ⚠️ Dynamic Speculative Planner (`packages/orchestration/src/utils/dsp.ts`) and Long-Horizon Planner (`src/lib/long-horizon-planner.ts`) are implemented but lack unit/integration coverage
- ⚠️ **NEW**: LangGraph streaming infrastructure needed for real-time workflow updates
- ⚠️ **NEW**: Thermal-aware LangGraph coordination requires A2A event integration
- ⚠️ **NEW**: Multi-agent patterns need shared state management and conflict resolution

---

## Phase 0 – Global Guardrails

| Test | Status | Notes |
| --- | --- | --- |
| `tests/regression/placeholders.spec.ts` | ✅ in repo | Baseline fixture maintained at 135 legacy hits |
| `tests/contracts/openapi-sync.spec.ts` | ⚪ todo | Must compare generated OpenAPI to Express handlers before API work |
| `packages/mcp-core/tests/tools-contract.test.ts` | ⚪ todo | Prevent `'mock'` adapters from shipping |

### Phase 0 Implementation

- Keep `scripts/brainwav-production-guard.ts` wired in CI
- Generate OpenAPI from Zod schemas and ensure every route handler exports real implementations
- Harden MCP tool registry to reject placeholder adapter values

### Phase 0 Validation

- Require `pnpm test:placeholders && pnpm test --filter contracts` locally before PR

### Phase 0 Blockers

- Updating the placeholder baseline must accompany any new detections to avoid false failures

---

## Phase 1 – State Unification (Migration Step 1)

| Test | Status | Action |
| --- | --- | --- |
| `packages/orchestration/tests/n0-state-contract.test.ts` | ✅ passes | Keep covering new adapters/fields as they land |
| `packages/kernel/tests/n0-projection.test.ts` | ✅ passes | Extend expectations when kernel adds new workflow metadata |
| `packages/agents/tests/unit/n0-shim.integration.test.ts` | ✅ passes | Stub + alias ensure model gateway adapters resolve during LangGraph shim tests |

### Phase 1 Implementation

- Maintain the Vitest alias/stub for `@cortex-os/model-gateway`; extend shim coverage when adapters gain new capabilities
- Finish adapter coverage in `packages/orchestration/src/langgraph/n0-adapters.ts` for PRP, CortexAgent, A2A states (current tests only cover available shapes)
- Backfill state merge helpers with cross-package assertions (agents ↔ kernel ↔ orchestration) using the shared schema
- Maintain the trimmed TypeScript surface (langgraph-only tsconfig) so `pnpm --filter @cortex-os/orchestration typecheck` stays green

### Phase 1 Validation

- Add to CI focus: `pnpm --filter @cortex-os/orchestration exec vitest run tests/n0-state-contract.test.ts`
- Pair with `pnpm --filter @cortex-os/agents exec vitest run tests/unit/n0-shim.integration.test.ts` once alias is wired

### Phase 1 Blockers

- Legacy directories remain excluded from the TypeScript program until they are refactored under the new architecture

---

## Phase 2 – Tool Dispatch Consolidation (Migration Step 2)

| Test | Status | Action |
| --- | --- | --- |
| `packages/orchestration/tests/tool-dispatch.budget.test.ts` | ✅ passes | Enforces time/token budgets and allow-list skips |
| `packages/hooks/tests/tool-dispatch-hooks.test.ts` | ✅ passes | Validates Pre/Post hook deny + mutation flows |
| `tests/regression/tool-dispatch-allowlist.spec.ts` | ✅ passes | Guards against unsanctioned `tool_dispatch` references |

### Phase 2 Implementation

- Ensure `dispatchTools` logs and surfaces `brAInwav`-branded errors for policy denials, skips, and hook actions
- Propagate slash command `allowed-tools` metadata into the N0 session so dispatch enforces allow-lists automatically
- Remove direct MLX/Ollama adapter invocations; require all tool/subagent calls to route through `dispatchTools`
- Add structured logging + telemetry (`@cortex-os/observability`) for dispatch start/settle events

### Phase 2 Validation

- CI quality gates run `pnpm --filter @cortex-os/orchestration exec vitest run tests/tool-dispatch.budget.test.ts tests/spool-settled.test.ts`
- Include `pnpm --filter @cortex-os/hooks exec vitest run src/__tests__/tool-dispatch-hooks.test.ts` in local verification when editing hook policies

### Phase 2 Blockers

- `dispatchTools` currently lacks partial-failure semantics; design outcome aggregation (fulfilled/rejected/skipped) before writing tests

---

## Phase 3 – Spool & Parallel Execution (Migration Step 3)

| Test | Status | Action |
| --- | --- | --- |
| `packages/orchestration/tests/spool-settled.test.ts` | ✅ passes | Confirms `runSpool` honours token budgets and abort signals |
| `packages/prp-runner/tests/spool-integration.test.ts` | ⚪ todo | Ensure PRP fan-out uses spool and surfaces deterministic ordering |
| `tests/perf/spool-throughput.test.ts` | ⚪ todo | Capture throughput metrics and append to `performance-history.json` |

### Phase 3 Implementation

- Extend `runSpool` with per-task start callbacks that emit `brAInwav` telemetry and enforce concurrency limits deterministically
- Wire spool into `agent.autodelegate` and PRP runner so parallel fan-out is centrally managed
- Implement cancellation propagation (AbortController) and ensure rejection reasons include budgets in error messages

### Phase 3 Validation

- `pnpm --filter @cortex-os/orchestration exec vitest run tests/spool-settled.test.ts` (already covered by CI guard)
- After additional spool suites exist, run `node scripts/perf-autotune.mjs performance-baseline.json performance-history.json --window 15 --headroom 30`

### Phase 3 Blockers

- Current worker loop never touches `onStart`; update implementation in tandem with tests to avoid regressions

---

## Phase 4 – API Server & Auth Hardening

| Test | Status | Action |
| --- | --- | --- |
| `apps/api/tests/routing/apiRoutes.spec.ts` | ✅ passes | Keep snapshots aligned with Prisma payloads |
| `apps/api/tests/auth/persistence.spec.ts` | ⚠️ skipped | Requires Docker runtime + Prisma adapter instead of in-memory |
| `apps/api/tests/auth/features.spec.ts` | ⚪ todo | Cover profile update, session revoke, 2FA, passkey flows |

### Phase 4 Implementation

- Replace in-memory Better Auth adapter with Prisma-backed adapter in `apps/api/src/auth/database-adapter.ts`
- Flesh out `/api/v1` route modules with Zod validation + service layer; tie telemetry metrics to real collectors
- Ensure health endpoints surface real queue/db metrics (no static numbers)

### Phase 4 Validation

- `pnpm prisma:migrate:dev --preview-feature --name auth-hardening`
- Add Supertest snapshots to prevent placeholder regressions

### Phase 4 Blockers

- `apps/api/tests/auth/persistence.spec.ts` currently skips when Docker is unavailable; ensure CI runner supports TestContainers

---

## Phase 5 – Master Agent Execution & Health

| Test | Status | Action |
| --- | --- | --- |
| `services/orchestration/tests/master-agent.exec.spec.ts` | ⚪ todo | Replace mock adapter assertions with real dispatch spies |
| `services/orchestration/tests/langgraph.integration.spec.ts` | ⚪ todo | Boot LangGraph harness and verify node logs |
| `services/orchestration/tests/health/pool-health.spec.ts` | ⚪ todo | Ensure metrics return live pool counts |
| `packages/orchestration/tests/adapters/stability.test.ts` | ⚪ todo | Protect adapter fallbacks & retries |

### Phase 5 Implementation

- Inject MLX/Ollama adapters via dependency injection so tests can spy on dispatch calls
- Replace static pool metrics with queue + heartbeat instrumentation
- Resolve outstanding orchestration `tsc` errors to unblock test execution

### Phase 5 Validation

- Extend `pnpm test:agents` to execute orchestrated plan fixtures once tests exist

### Phase 5 Blockers

- Without fixing TypeScript errors, affected Vitest suites cannot run in CI

---

## Phase 6 – Memories Service Reliability

| Test | Status | Action |
| --- | --- | --- |
| `packages/memories/tests/k-v-store.integration.test.ts` | ⚪ todo | Matrix over SQLite, Prisma, Local Memory |
| `packages/memories/tests/health-report.test.ts` | ⚪ todo | Ensure `/memories/stats` reflects active backend |
| `tests/e2e/memories.health.test.ts` | ⚪ todo | Docker Compose matrix smoke |

### Phase 6 Implementation

- Complete Qdrant adapter in `packages/memories/src/adapters/store.qdrant.ts`
- Wire health endpoint to adapter-specific stats with brAInwav branding

### Phase 6 Validation

- Add `pnpm --filter @cortex-os/memories exec vitest run` to smart CI focus when tests exist

---

## Phase 7 – A2A Streaming & Outbox

| Test | Status | Action |
| --- | --- | --- |
| `packages/a2a/tests/validation/sanitization.test.ts` | ⚪ todo | Recursive sanitization without mutating safe fields |
| `packages/a2a/tests/streaming/mcp-subscription.test.ts` | ⚪ todo | SSE/WebSocket stream assertions |
| `packages/a2a/tests/outbox/retry-tool.test.ts` | ⚪ todo | Deterministic retry/backoff without `Math.random()` |
| `services/orchestration/tests/outbox.retry.spec.ts` | ⚪ todo | Confirm orchestration honours retry policy |

### Phase 7 Implementation

- Implement sanitization, SSE streaming, and deterministic retries with metrics instrumentation
- Ensure all outputs/logs carry `brAInwav` branding

### Phase 7 Validation

- Include `pnpm test:a2a` in CI once suites exist

---

## Phase 8 – Evidence Enhancement & MCP Bridge

| Test | Status | Action |
| --- | --- | --- |
| `packages/evidence-runner/tests/enhancement.test.ts` | ⚪ todo | Ensure `enhanceEvidence` enriches output |
| `packages/mcp-bridge/tests/browser-executor.test.ts` | ⚪ todo | Playwright-driven DOM extraction |
| `packages/mcp-bridge/tests/database-executor.test.ts` | ⚪ todo | Parameterised SQL execution |
| `packages/mcp-core/tests/tool-mapping.test.ts` | ⚪ todo | Safe fallback for unknown tool types |

### Phase 8 Implementation

- Integrate MLX/remote LLMs for evidence enhancement with deterministic configs
- Wire Playwright + database executors with real drivers and secure parameterisation
- Expand tool mappings and add telemetry/logging

### Phase 8 Validation

- Add `pnpm test:mcp:smoke` gated by `PLAYWRIGHT=1`

---

## Phase 9 – Apps Production Readiness

| Test | Status | Action |
| --- | --- | --- |
| `apps/api/tests/routing-completeness.test.ts` | ⚪ todo | Fail when TODO routes remain |
| `apps/cortex-marketplace/tests/mcp-implementation.test.ts` | ⚪ todo | Verify nine MCP tools return real data |
| `apps/cortex-os/tests/metrics-reality.test.ts` | ⚪ todo | Ensure no `Math.random()` metrics |
| `apps/cortex-py/tests/thermal-guard-production.test.ts` | ⚪ todo | Cross-platform thermal monitoring |

### Phase 9 Implementation

- Complete Marketplace MCP service integrations
- Replace fake metrics with real system probes
- Implement thermal monitoring with platform guards

### Phase 9 Validation

- Include apps directory in placeholder regression allowlist review

---

## Phase 10 – Slash Commands, Hooks, and Tool Binding

| Area | Test | Status | Action |
| --- | --- | --- | --- |
| Slash commands | `packages/commands/tests/slash-integration.test.ts` | ⚪ todo | End-to-end `/help`, `/agents`, `/model`, `/compact` coverage |
| Hook filesystem | `packages/hooks/tests/filesystem-config.test.ts` | ⚪ todo | `.cortex/hooks/**` YAML hot reload |
| Agent templates | `packages/agents/tests/file-agent-loader.test.ts` | ⚪ todo | `.cortex/agents/**` to LangGraph subgraph compilation |
| Kernel binding | `packages/kernel/tests/tool-binding.test.ts` | ⚪ todo | `bindKernelTools()` returns complete tool set |

### Implementation pairing

- Implement `.cortex/commands`, `.cortex/hooks`, `.cortex/agents` loaders with precedence rules (project overrides user)
- Ensure `bindKernelTools` stitches shell, FS, web fetch tools with allow-lists and timeouts
- Surface command metadata (allowed tools, models) to orchestration state so migration steps stay aligned

---

## Phase 11 – Enhanced Planning & Coordination (DSP Roadmap)

| Test | Status | Action |
| --- | --- | --- |
| `packages/orchestration/tests/dsp/long-horizon-planner.test.ts` | ⚪ todo | Validate planning phases, adaptive depth, and context isolation |
| `packages/orchestration/tests/dsp/context-manager.test.ts` | ⚪ todo | Ensure planning contexts quarantine correctly |
| `packages/orchestration/tests/coordination/adaptive-strategy.test.ts` | ⚪ todo | Adaptive coordination picks strategy based on capability + history |
| `packages/orchestration/tests/coordination/structured-planning-integration.test.ts` | ⚪ todo | Long-horizon planner integrates with multi-agent orchestration |

### Phase 11 Implementation

- Extend `packages/orchestration/src/lib/long-horizon-planner.ts` with persistence hooks once tests define behaviour
- Implement `PlanningContextManager` for isolation and history trimming
- Create `AdaptiveCoordinationManager` and `strategy-selector` modules with telemetry + brAInwav branding
- Integrate planners with orchestration workflows so planning phases flow into LangGraph state

### Phase 11 Validation

- Add focussed DSP suite to CI: `pnpm --filter @cortex-os/orchestration exec vitest run "tests/dsp/**/*.test.ts"`

---

## Phase 12 – MCP Workspace & Planning Tools

| Test | Status | Action |
| --- | --- | --- |
| `packages/mcp-core/tests/tools/workspace-tools.test.ts` | ⚪ todo | Workspace create/ls/read/write with isolation |
| `packages/mcp-core/tests/tools/planning-tools.test.ts` | ⚪ todo | Planning toolchain integrates with DSP |
| `packages/mcp-core/tests/tools/coordination-tools.test.ts` | ⚪ todo | Coordination tools respect security + isolation |

### Phase 12 Implementation

- Build workspace manager + persistent storage with sandbox enforcement
- Expose planning/coordination MCP tools that call into orchestration planners
- Emit A2A events and ensure outputs carry brAInwav attribution

---

## Phase 13 – Security & Compliance Integration (cortex-sec)

| Test | Status | Action |
| --- | --- | --- |
| `packages/cortex-sec/tests/security-integration/security-scan-tools.test.ts` | ⚪ todo | MCP tools execute Semgrep/dependency scans deterministically |
| `packages/cortex-sec/tests/planning/compliance-driven-planning.test.ts` | ⚪ todo | Planning respects security constraints |
| `packages/orchestration/tests/security/security-coordinator.test.ts` | ⚪ todo | Orchestration adjusts plans when compliance flags appear |

### Phase 13 Implementation

- Integrate cortex-sec MCP tools into tool binding with allow-lists
- Extend planning context with compliance metadata, ensuring violations adjust strategies
- Emit security events over A2A and update prompt templates with security guidance

---

## Phase 14 – Prompt Templates & Context-Aware Prompting

| Test | Status | Action |
| --- | --- | --- |
| `packages/agents/tests/prompts/template-selection.test.ts` | ⚪ todo | PromptTemplateManager selects correct template + reasoning |
| `packages/agents/tests/prompts/context-adaptation.test.ts` | ⚪ todo | Adaptations respect planning context & capabilities |
| `packages/agents/tests/prompts/effectiveness-tracking.test.ts` | ⚪ todo | Usage history trims, learns, and influences selection |

### Phase 14 Implementation

- Expand `PromptTemplateManager` default templates with measurable examples
- Add effectiveness tracking and adaptive prompt selection logic tied to context
- Ensure all prompts include brAInwav branding and nO behaviour guidelines

---

## Phase 15 – LangGraph Streaming & Real-time Updates

| Test | Status | Action |
| --- | --- | --- |
| `packages/orchestration/tests/streaming/langgraph-astream.test.ts` | ⚪ todo | LangGraph StateGraph streaming to WebSocket clients with brAInwav telemetry |
| `packages/orchestration/tests/streaming/state-events.test.ts` | ⚪ todo | Real-time state updates via A2A events with proper error handling |
| `apps/cortex-webui/tests/langgraph-streaming.test.ts` | ⚪ todo | UI receives LangGraph workflow updates with brAInwav branding |
| `packages/orchestration/tests/streaming/checkpoint-streaming.test.ts` | ⚪ todo | Stream checkpoint events during workflow execution |

### Phase 15 Implementation

- Implement `StateGraph.astream()` and `StateGraph.astream_events()` integration with WebSocket infrastructure
- Create streaming middleware that emits brAInwav-branded events to A2A event bus
- Build real-time UI components that display LangGraph workflow progress with proper error states
- Integrate LangGraph streaming with existing observability infrastructure and structured logging
- Ensure all streaming outputs include brAInwav attribution and proper telemetry context

### Phase 15 Validation

- Add streaming integration tests to CI: `pnpm --filter @cortex-os/orchestration exec vitest run "tests/streaming/**/*.test.ts"`
- Include WebSocket connection resilience testing with reconnection scenarios
- Validate streaming performance under load with multiple concurrent LangGraph workflows

### Phase 15 Blockers

- WebSocket infrastructure must be stable before implementing LangGraph streaming integration
- Streaming events require proper rate limiting to prevent client overwhelm during intensive workflows

---

## Phase 16 – Thermal-Aware LangGraph Orchestration

| Test | Status | Action |
| --- | --- | --- |
| `packages/orchestration/tests/thermal/mlx-thermal-integration.test.ts` | ⚪ todo | LangGraph pauses on thermal warnings with graceful degradation |
| `packages/orchestration/tests/thermal/model-fallback.test.ts` | ⚪ todo | Auto-fallback to Ollama on MLX thermal shutdown with brAInwav logging |
| `apps/cortex-py/tests/langgraph-thermal-coordination.test.ts` | ⚪ todo | A2A thermal events trigger LangGraph strategy changes deterministically |
| `packages/orchestration/tests/thermal/thermal-recovery.test.ts` | ⚪ todo | LangGraph workflows resume after thermal recovery with state integrity |

### Phase 16 Implementation

- Integrate cortex-py thermal monitoring events with LangGraph StateGraph node execution
- Implement thermal-aware model selection nodes that respect MLX temperature thresholds
- Create adaptive execution strategies that automatically throttle or pause workflows during thermal warnings
- Build thermal recovery mechanisms that resume workflows when temperatures normalize
- Ensure all thermal events and responses include brAInwav branding in logs and telemetry

### Phase 16 Validation

- Add thermal integration to CI focus: `pnpm --filter @cortex-os/orchestration exec vitest run "tests/thermal/**/*.test.ts"`
- Include thermal simulation testing with mock temperature events and recovery scenarios
- Validate thermal coordination with real MLX hardware when available in test environments

### Phase 16 Blockers

- Requires stable A2A event infrastructure for thermal event propagation
- Thermal testing requires coordination with cortex-py service health checks

---

## Phase 17 – Multi-Agent LangGraph Coordination

| Test | Status | Action |
| --- | --- | --- |
| `packages/orchestration/tests/multi-agent/graph-coordination.test.ts` | ⚪ todo | Multiple StateGraphs coordinate via shared N0State with conflict resolution |
| `packages/orchestration/tests/multi-agent/distributed-workflows.test.ts` | ⚪ todo | LangGraph workflows across different services with brAInwav coordination |
| `packages/a2a/tests/langgraph/graph-to-graph-events.test.ts` | ⚪ todo | StateGraph nodes emit A2A events to other graphs with proper routing |
| `packages/orchestration/tests/multi-agent/agent-handoff.test.ts` | ⚪ todo | Seamless agent handoff between LangGraph workflows with state preservation |

### Phase 17 Implementation

- Build multi-agent coordination layer that manages multiple concurrent LangGraph workflows
- Implement shared state management for cross-workflow communication via N0State adapters
- Create agent handoff mechanisms that transfer workflow control between different LangGraph instances
- Develop distributed workflow patterns that span multiple services while maintaining consistency
- Ensure all multi-agent coordination includes brAInwav telemetry and proper error attribution

### Phase 17 Validation

- Add multi-agent coordination to CI: `pnpm --filter @cortex-os/orchestration exec vitest run "tests/multi-agent/**/*.test.ts"`
- Include distributed scenario testing with simulated network partitions and service failures
- Validate coordination performance with multiple concurrent agent workflows

### Phase 17 Blockers

- Requires mature N0State management and adapter layer for cross-workflow state sharing
- Multi-agent patterns depend on stable A2A event infrastructure for coordination

---

## Phase 18 – Production Integration Testing

| Test | Status | Action |
| --- | --- | --- |
| `tests/integration/full-system-langgraph.test.ts` | ⚪ todo | End-to-end LangGraph + all systems integration with brAInwav observability |
| `tests/performance/langgraph-load.test.ts` | ⚪ todo | Load testing with real model calls and thermal monitoring under stress |
| `tests/integration/failure-scenarios.test.ts` | ⚪ todo | System behavior when components fail during LangGraph execution |
| `tests/integration/production-readiness.test.ts` | ⚪ todo | Comprehensive production scenario testing with all brAInwav requirements |

### Phase 18 Implementation

- Build comprehensive integration test suite covering all LangGraph + system component interactions
- Implement load testing infrastructure that simulates production-scale LangGraph workflow execution
- Create failure scenario testing that validates system resilience during component outages
- Develop production readiness validation that ensures all brAInwav standards are met
- Include end-to-end testing of streaming, thermal coordination, and multi-agent scenarios

### Phase 18 Validation

- Add integration testing to release pipeline: `pnpm test:integration:langgraph`
- Include performance regression testing that maintains baseline metrics in `performance-history.json`
- Validate production readiness criteria before any deployment approvals

### Phase 18 Blockers

- Requires completion of all previous phases for comprehensive integration testing
- Production testing requires access to representative hardware and infrastructure

---

## Governance & Metrics

- Continue using `pnpm lint:smart`, `pnpm typecheck:smart`, and targeted `pnpm test:smart --focus <pkg>` once per phase
- Record spool/dispatch performance changes in `performance-history.json`; retune with `scripts/perf-autotune.mjs`
- Enforce CODESTYLE (`≤40` line functions, named exports only, async/await) while refactoring legacy modules

## Known Issues to Resolve en Route

1. **TypeScript compilation failures** – `packages/orchestration/src/langgraph/streaming.ts` and `src/intelligence/adaptive-decision-engine.ts` still block `tsc --noEmit`
2. **Vitest module aliasing** – `@cortex-os/model-gateway` mock must be resolvable so `n0-shim.integration.test.ts` can run
3. **Slash command coverage** – No automated guarantee that `/` commands bypass the parent model path
4. **Spool/dispatch telemetry** – Lacks OpenTelemetry spans (`n0.tool_dispatch`, `n0.spool`) referenced in analytics
5. **LangGraph streaming infrastructure** – WebSocket connections need resilience patterns for production streaming
6. **Thermal event propagation** – A2A event bus must handle thermal events with proper priority and routing
7. **Multi-agent state conflicts** – N0State merging across concurrent workflows requires conflict resolution strategies
8. **Production observability** – All new phases require comprehensive brAInwav-branded metrics and error tracking

## Definition of Done

- All tests above implemented via fail-first TDD and committed alongside code
- `pnpm lint:smart && pnpm typecheck:smart && pnpm test:smart` succeed with no legacy skips
- No routes, tools, or adapters emit placeholder strings (guards + targeted tests confirmed)
- N0 graph streams telemetry + logs with brAInwav branding at every node (parse → hooks → plan → dispatch → spool → stream)
- Slash commands, hooks, agents, and kernel surface share the same allow-list + budgeting contracts
- Advanced planners, security integrations, and MCP toolsets operate under automated coverage
- Documentation reflects real implementations and is cross-checked by guard scripts
- **LangGraph streaming integration** provides real-time workflow updates with brAInwav telemetry
- **Thermal-aware orchestration** automatically handles MLX thermal events with graceful degradation
- **Multi-agent coordination** enables complex workflows spanning multiple LangGraph instances
- **Production integration testing** validates all system interactions under realistic load conditions
- Final smoke test executes `/agents/execute` through LangGraph → dispatch → spool → PRP → MCP, persisting data and streaming outputs without mocks
- **brAInwav enterprise readiness**: All components include proper branding, observability, and production-grade error handling

<!-- markdownlint-enable MD013 -->
