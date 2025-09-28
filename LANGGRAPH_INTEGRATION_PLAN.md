# LangGraph Integration Plan – TDD Roadmap for n0 Master Agent Loop

<!-- markdownlint-disable MD013 -->

## Objective

Drive the Cortex-OS LangGraph migration through **state unification → tool dispatch → spool orchestration → streaming integration → thermal coordination → multi-agent coordination → code mode integration → production readiness**, leveraging existing mature components instead of rebuilding from scratch. This plan merges the remaining action items in `final-cortex-tdd-plan.md` and `cortex-enhancement-tdd-plan.md`, aligns them with the current codebase, and sequences every task around strict TDD.

The expanded plan now includes **5 critical new phases** that address production-ready LangGraph integration:

- **Real-time streaming** for workflow updates and UI integration
- **Thermal-aware orchestration** that responds to MLX hardware constraints  
- **Multi-agent coordination** patterns for complex distributed workflows
- **brAInwav Code Mode Integration** that converts MCP tool calls into executable code across TypeScript, Python, and Rust
- **Comprehensive integration testing** that validates all system interactions

### brAInwav Code Mode Revolution

**Code Mode** represents a paradigm shift from traditional tool calling to executable code generation. Instead of making multiple individual MCP tool calls, models generate efficient code that orchestrates operations through loops, conditionals, and batch processing.

**Traditional Tool Calling:**

```json
[
  {"tool": "filesystem_read", "args": {"path": "file1.ts"}},
  {"tool": "filesystem_read", "args": {"path": "file2.ts"}},
  {"tool": "filesystem_read", "args": {"path": "file3.ts"}}
]
```

**brAInwav Code Mode:**

```typescript
// Model generates this efficient TypeScript code
const files = await filesystem.listDir('/src');
for (const file of files.filter(f => f.endsWith('.ts'))) {
  const content = await filesystem.read(file);
  const analysis = await codeAnalysis.analyze(content);
  if (analysis.quality < 0.8) {
    await github.createIssue({
      title: `brAInwav: Quality issue in ${file}`,
      labels: ['automated', 'brainwav']
    });
  }
}
```

**Benefits:**

- **3-5x Token Efficiency**: One code block vs many tool calls
- **Better Orchestration**: Loops, conditionals, complex logic
- **Performance**: Batch operations instead of sequential calls
- **Natural for Models**: Code patterns vs tool schemas
- **Cross-Language**: TypeScript, Python (pyproject.toml), Rust (edition 2024)

Each phase documents:

1. **Failing test(s) to author first** (exact file paths with current status)
2. **Implementation pairing** (code required to turn tests green)
3. **Validation hooks** (commands/checks to keep regressions out)
4. **Blockers / accuracy notes** (ground-truth facts from today's repo)

## Current State Snapshot (2025-09-27)

- ✅ Shared `N0State` schema (`packages/orchestration/src/langgraph/n0-state.ts`) and adapters (`n0-adapters.ts`) exist with passing coverage in `packages/orchestration/tests/n0-state-contract.test.ts`
- ✅ Kernel projection shim is exercised by `packages/kernel/tests/n0-projection.test.ts`
- ✅ `packages/agents/tests/unit/n0-shim.integration.test.ts` now passes with the Vitest alias + shim for `@cortex-os/model-gateway`
- ✅ Tool dispatch and spool implementations (`tool-dispatch.ts`, `spool.ts`) now ship with regression coverage for budgets, hooks, and allow-lists
- ✅ `pnpm --filter @cortex-os/agents typecheck` and `pnpm --filter @cortex-os/orchestration typecheck` both pass after slimming the orchestration surface to LangGraph-only modules
- ✅ cortex-py thermal monitoring with brAInwav branding active and emitting A2A events
- ✅ Placeholder regression guard (`tests/regression/placeholders.spec.ts`) and branded random ban (`tests/regression/math-random-ban.spec.ts`) are green with the 135-hit legacy baseline
- ✅ Composite provider fallback coverage now lives in helper-driven tests (`packages/orchestration/src/providers/__tests__/composite-provider.test.ts`), keeping every spec under 40 lines while passing in isolation
- ✅ OrbStack hybrid environment verified on 2025-09-27 via `./scripts/verify-hybrid-env.sh --json`; `docs/orbstack-setup.md` and `docs/dev-tools-reference.md` now document the brAInwav verification workflow and sample output
- ⚠️ Slash command runner lives in `packages/commands/src/index.ts`; no end-to-end tests ensure `/help`, `/agents`, `/model`, `/compact` short-circuit LangGraph
- ⚠️ Dynamic Speculative Planner (`packages/orchestration/src/utils/dsp.ts`) and Long-Horizon Planner (`src/lib/long-horizon-planner.ts`) are implemented but lack unit/integration coverage
- ⚠️ **NEW**: LangGraph streaming infrastructure needed for real-time workflow updates
- ⚠️ **NEW**: Thermal-aware LangGraph coordination requires A2A event integration
- ⚠️ **NEW**: Multi-agent patterns need shared state management and conflict resolution
- ⚠️ `pnpm --filter @cortex-os/orchestration test` currently fails because legacy tool orchestration suites (`tool-orchestrator.test.ts`, `primitive-tool-layer.test.ts`, `execution-planner.test.ts`, dashboard layers) still expect unimplemented APIs; the composite provider specs pass when run directly

### Verification Snapshot (Build/Lint/Test)

- **Build**: not run on 2025-09-27 during fallback refactor verification
- **Lint**: not run (unchanged codepaths outside documentation)
- **Tests**: `pnpm --filter @cortex-os/orchestration test` ❌ (fails on legacy suites listed above); `pnpm vitest run packages/orchestration/src/providers/__tests__/composite-provider.test.ts` ✅

---

## Phase 0 – Global Guardrails

| Test | Status | Notes |
| --- | --- | --- |
| `tests/regression/placeholders.spec.ts` | ✅ in repo | Baseline fixture maintained at 135 legacy hits |
| `tests/contracts/openapi-sync.spec.ts` | ✅ complete | Must compare generated OpenAPI to Express handlers before API work |
| `packages/mcp-core/tests/tools-contract.spec.ts` | ✅ complete | Prevent `'mock'` adapters from shipping |

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

#### Work Completed
- ✅ Maintained the Vitest alias and stubs for `@cortex-os/model-gateway` in `packages/agents/vitest.config.ts` and the shared setup utilities so shim coverage stays stable while real adapters land.
- ✅ Extended the LangGraph adapters in `packages/orchestration/src/langgraph/n0-adapters.ts` to cover agent, Cortex, and PRP workflow shapes; helpers now normalise context and merge overrides through the shared schema.
- ✅ Preserved the langgraph-only TypeScript surface (dedicated `tsconfig`) to keep the orchestration package type checking isolated from legacy directories.

#### Fixes Outstanding
- [ ] Backfill additional cross-package assertions that prove the shared state contracts between agents, kernel, and orchestration stay aligned when new fields are introduced.

### Phase 1 Validation

- `pnpm --filter @cortex-os/orchestration exec vitest run tests/n0-state-contract.test.ts`
- `pnpm --filter @cortex-os/agents exec vitest run tests/unit/n0-shim.integration.test.ts`

### Phase 1 Blockers

- Legacy directories remain excluded from the TypeScript program until they are refactored under the new architecture.

---

## Phase 2 – Tool Dispatch Consolidation (Migration Step 2)

| Test | Status | Action |
| --- | --- | --- |
| `packages/orchestration/tests/tool-dispatch.budget.test.ts` | ✅ passes | Enforces time/token budgets and allow-list skips |
| `packages/hooks/tests/tool-dispatch-hooks.test.ts` | ✅ passes | Validates Pre/Post hook deny + mutation flows |
| `tests/regression/tool-dispatch-allowlist.spec.ts` | ✅ passes | Guards against unsanctioned `tool_dispatch` references |

### Phase 2 Implementation

#### Work Completed
- ✅ Routed all tool and subagent invocations through `dispatchTools`, removing remaining direct MLX/Ollama adapter calls and guaranteeing centralised enforcement.
- ✅ Instrumented `dispatchTools` with structured `brAInwav` logging for denials, skips, and hook mutations so observability captures every policy decision.
- ✅ Propagated slash command `allowed-tools` metadata into the N0 session adapters, ensuring the dispatch layer consults command-scoped allow lists automatically.

#### Fixes Outstanding
- [ ] Expand dispatch telemetry to publish aggregate success/failure counters to the shared observability package for fleet-level dashboards.

### Phase 2 Validation

- `pnpm --filter @cortex-os/orchestration exec vitest run tests/tool-dispatch.budget.test.ts tests/spool-settled.test.ts`
- `pnpm --filter @cortex-os/hooks exec vitest run src/__tests__/tool-dispatch-hooks.test.ts`

### Phase 2 Blockers

- `dispatchTools` currently lacks partial-failure semantics; design outcome aggregation (fulfilled/rejected/skipped) before writing tests.

---

## Phase 3 – Spool & Parallel Execution (Migration Step 3)

| Test | Status | Action |
| --- | --- | --- |
| `packages/orchestration/tests/spool-settled.test.ts` | ✅ passes | Confirms `runSpool` honours token budgets and abort signals |
| `packages/prp-runner/tests/integration/spool-integration.test.ts` | ✅ passes | PRP gates execute through `runSpool` with onStart/onSettle telemetry |
| `tests/perf/spool-throughput.test.ts` | ✅ passes | Baselines `runSpool` throughput with budget assertions |

### Phase 3 Implementation

#### Work Completed
- ✅ Added deterministic concurrency management and per-task start callbacks to `runSpool`, emitting `brAInwav` telemetry when tasks enter/exit the queue.
- ✅ Routed `agent.autodelegate` and the PRP runner through the central spool so every fan-out respects budget ceilings and cancellation semantics.
- ✅ Threaded AbortController cancellation through spool workers and ensured rejected promises surface budget context in their error payloads.

#### Fixes Outstanding
- [ ] Capture historical spool throughput metrics in `performance-history.json` once the perf harness is re-enabled post-refactor.

### Phase 3 Validation

- `pnpm --filter @cortex-os/orchestration exec vitest run tests/spool-settled.test.ts`
- `pnpm --filter @cortex-os/prp-runner exec vitest run tests/integration/spool-integration.test.ts`
- `pnpm exec vitest --config tests/perf/vitest.config.ts run tests/perf/spool-throughput.test.ts`
- `node scripts/perf-autotune.mjs performance-baseline.json performance-history.json --window 15 --headroom 30`

### Phase 3 Blockers

- Additional throughput baselines should feed into `performance-history.json` once perf-autotune is run after significant changes.

---

## Phase 4 – API Server & Auth Hardening

| Test | Status | Action |
| --- | --- | --- |
| `apps/api/tests/routing/apiRoutes.spec.ts` | ✅ passes | Keep snapshots aligned with Prisma payloads |
| `apps/api/tests/auth/persistence.spec.ts` | ✅ passes | Runs against Prisma-backed Postgres via OrbStack/TestContainers |
| `apps/api/tests/auth/features.spec.ts` | ✅ passes | Exercises profile update, session revoke, 2FA, and passkey flows |

### Phase 4 Implementation

#### Work Completed
- ✅ Shipped the Prisma-backed Better Auth adapter in `apps/api/src/auth/database-adapter.ts`, aligning session persistence with the production database.
- ✅ Wrapped `/api/v1` route handlers with Zod validation and thin service layers so telemetry hooks report real collectors instead of placeholders.
- ✅ Replaced static health responses with live queue and database probes exposed through branded status payloads.

#### Fixes Outstanding
- [ ] Harden migration rollback flows for the auth schema to protect shared development databases when new fields land.

### Phase 4 Validation

- `pnpm prisma:migrate:dev --preview-feature --name auth-hardening`
- `pnpm --filter @cortex-os/api exec vitest run tests/auth/persistence.spec.ts --reporter tap`
- `pnpm --filter @cortex-os/api exec vitest run tests/auth/features.spec.ts --reporter tap`
- `./scripts/verify-hybrid-env.sh --json`

### Phase 4 Blockers

- CI runners must expose an OrbStack-compatible Docker socket (or set `TESTCONTAINERS_DAEMON_URL`) so the Postgres-backed specs stay enabled.

---

## Phase 5 – Master Agent Execution & Health

| Test | Status | Action |
| --- | --- | --- |
| `services/orchestration/tests/master-agent.exec.spec.ts` | ✅ complete | Dispatch instrumentation verified under workspace test run |
| `services/orchestration/tests/langgraph.integration.spec.ts` | ✅ complete | LangGraph harness included in workspace runs with branded logging |
| `services/orchestration/tests/health/pool-health.spec.ts` | ✅ complete | Health metrics suite executes via Vitest workspace entry |
| `packages/orchestration/tests/adapters/stability.test.ts` | ✅ complete | Protect adapter fallbacks & retries |

### Phase 5 Implementation

#### Work Completed
- ✅ Introduced dependency injection for MLX and Ollama adapters inside the master agent so orchestration tests can assert on dispatch behaviour without leaking globals.
- ✅ Replaced static pool metrics with heartbeat-driven instrumentation that records queue depth and worker health under the `brAInwav` namespace.
- ✅ Cleared the lingering TypeScript errors in the orchestration package, restoring green builds for the master agent Vitest suites.

#### Fixes Outstanding
- [ ] Backport adapter retry strategy metrics to the fleet dashboards once the shared telemetry schema is versioned.

### Phase 5 Validation

- `pnpm test:agents`

### Phase 5 Blockers

- Without fixing TypeScript errors, affected Vitest suites cannot run in CI

---

## Phase 6 – Memories Service Reliability

| Test | Status | Action |
| --- | --- | --- |
| `packages/memories/tests/k-v-store.integration.test.ts` | ✅ complete | Matrix over SQLite, Prisma, Local Memory |
| `packages/memories/tests/health-report.test.ts` | ✅ complete | Ensure `/memories/stats` reflects active backend |
| `tests/e2e/memories.health.test.ts` | ✅ complete | Docker Compose matrix smoke |

### Phase 6 Implementation

#### Work Completed
- ✅ Completed the Qdrant adapter in `packages/memories/src/adapters/store.qdrant.ts`, providing deterministic connectivity and retries.
- ✅ Wired the memories health endpoint to adapter-aware statistics with `brAInwav` branding so monitoring surfaces the active backend.

#### Fixes Outstanding
- [ ] Add regression coverage for adapter failover scenarios once additional backends are introduced.

### Phase 6 Validation

- `pnpm --filter @cortex-os/memories exec vitest run`

---

## Phase 7 – A2A Streaming & Outbox

| Test | Status | Action |
| --- | --- | --- |
| `packages/a2a/tests/validation/sanitization.test.ts` | ✅ complete | Recursive sanitization without mutating safe fields |
| `packages/a2a/tests/streaming/mcp-subscription.test.ts` | ✅ complete | SSE/WebSocket stream assertions |
| `packages/a2a/tests/outbox/retry-tool.test.ts` | ✅ complete | Deterministic retry/backoff without `Math.random()` |
| `packages/a2a/tests/orchestration/outbox.retry.spec.ts` | ✅ complete | Confirm orchestration honours retry policy |

### Phase 7 Implementation

#### Work Completed
- ✅ Delivered sanitisation, SSE streaming, and deterministic retry flows with metrics instrumentation across the `@cortex-os/a2a` packages.
- ✅ Ensured every output/log is `brAInwav` branded and relocated business logic from test files into dedicated utilities under `packages/a2a/a2a-core/src/lib/`.
- ✅ Implemented hash-based retry backoff to avoid `Math.random()` and added full regression coverage for streaming, sanitisation, and retry behaviour.

#### Fixes Outstanding
- [ ] Add load-test coverage for the SSE streaming path once the perf harness is shared with LangGraph telemetry.

### Phase 7 Validation

- `pnpm test:a2a`
- Manual verification of branding within A2A logging outputs.

---

## Phase 8 – Evidence Enhancement & MCP Bridge

| Test | Status | Action |
| --- | --- | --- |
| `packages/evidence-runner/tests/enhancement.test.ts` | 🟡 planned | Codify deterministic enrichments for `enhanceEvidence` |
| `packages/mcp-bridge/tests/browser-executor.test.ts` | 🟡 planned | Playwright-driven DOM extraction with hardened sanitisation |
| `packages/mcp-bridge/tests/database-executor.test.ts` | 🟡 planned | Parameterised SQL execution and connection lifecycle |
| `packages/mcp-core/tests/tool-mapping.test.ts` | 🟡 planned | Safe fallback for unknown tool types with telemetry |

### Phase 8 Implementation

#### Work Completed
- ✅ Scoped Vitest harness structure for `packages/evidence-runner/tests/enhancement.test.ts`, including fixture locations (`fixtures/enhanceEvidence/`) and a seeded MLX configuration strategy so snapshots can be regenerated deterministically.
- ✅ Drafted executor surface for the MCP bridge (`BrowserExecutor`, `DatabaseExecutor`) and aligned constructor signatures with existing `packages/mcp-bridge/src/executors/base-executor.ts` helpers to minimise churn.
- ✅ Captured telemetry contract updates for `packages/mcp-core` so new executor types emit structured `brAInwav` logs and fallback metrics through the shared `@cortex-os/telemetry` package.

#### Fixes Outstanding
- [ ] Implement deterministic MLX/remote LLM configurations inside `packages/evidence-runner`:
  - [ ] Introduce `SeededInferenceConfig` helper under `src/config/seeded-inference.ts` with explicit seed + model identifiers.
  - [ ] Record golden fixtures via `fixtures/enhanceEvidence/*.json` and teach the Vitest suite to diff against them using a tolerance-aware matcher (no `Math.random()`).
- [ ] Add Playwright-backed browser executor in `packages/mcp-bridge`:
  - [ ] Create `BrowserExecutor` with dependency injection for `browserType` and navigation timeouts; enforce DOM sanitisation via DOMPurify equivalents on the agent side.
  - [ ] Write Playwright smoke tests gated by `PLAYWRIGHT=1`, recording deterministic HTML fixtures in `tests/__fixtures__/browser/`.
- [ ] Implement parameterised SQL executor in `packages/mcp-bridge`:
  - [ ] Build `DatabaseExecutor` using `better-sqlite3` in tests and node-postgres in production, forcing prepared statements and connection pooling guards.
  - [ ] Validate error handling + logging paths in `tests/database-executor.test.ts`, ensuring secrets are redacted with `brAInwav` prefixes.
- [ ] Extend `packages/mcp-core` tool mappings:
  - [ ] Add explicit mapping for the new executor identifiers and surface telemetry counters under `toolMapping.fallback`.
  - [ ] Write regression tests that simulate unknown tool types and assert the fallback emits warnings without throwing.

#### Follow-Ups
- [ ] Align with infrastructure on bundling Playwright browser binaries inside CI containers and document the opt-in flag in `docs/testing/playwright.md`.
- [ ] Coordinate with security to review SQL executor parameterisation against the latest injection checklist before enabling in production.
- [ ] Update developer onboarding docs (`docs/evidence-runner.md`, `docs/mcp-bridge.md`) with new harness instructions once implementations land.

### Phase 8 Validation

- Author `pnpm --filter @cortex-os/evidence-runner exec vitest run tests/enhancement.test.ts` to prove enrichments stay deterministic.
- Execute `PLAYWRIGHT=1 pnpm --filter @cortex-os/mcp-bridge exec vitest run tests/browser-executor.test.ts` within CI and locally when browsers are available.
- Run `pnpm --filter @cortex-os/mcp-bridge exec vitest run tests/database-executor.test.ts` using the SQLite-backed fixture database.
- Gate the new tool mapping behaviour with `pnpm --filter @cortex-os/mcp-core exec vitest run tests/tool-mapping.test.ts`.
- Bundle the above in a convenience target `pnpm test:mcp:smoke` (Playwright optional) so regressions surface before integration branches merge.

### Phase 8 Blockers

- Availability of headless browser infrastructure in CI for the Playwright executor suites (tracked via infra ticket `INFRA-1845`).
- Security sign-off for storing deterministic MLX fixtures that may include anonymised evidence snippets.
- Coordination with database platform owners to provision non-production credentials for automated smoke tests.

---

## Phase 9 – Apps Production Readiness

| Test | Status | Action |
| --- | --- | --- |
| `apps/api/tests/routing-completeness.test.ts` | ⚪ todo | Fail when TODO routes remain |
| `apps/cortex-marketplace/tests/mcp-implementation.test.ts` | ⚪ todo | Verify nine MCP tools return real data |
| `apps/cortex-os/tests/metrics-reality.test.ts` | ⚪ todo | Ensure no `Math.random()` metrics |
| `apps/cortex-py/tests/thermal-guard-production.test.ts` | ⚪ todo | Cross-platform thermal monitoring |

### Phase 9 Implementation

#### Work Completed
- ☐ None yet – marketplace productionisation is pending full MCP integration.

#### Fixes Outstanding
- [ ] Implement end-to-end Marketplace MCP service integrations, including credential rotation and error handling for each tool.
- [ ] Replace simulated metrics in `apps/cortex-os` with concrete system probes (CPU, memory, GPU) and enforce deterministic fixtures for tests.
- [ ] Extend `apps/cortex-py` with cross-platform thermal monitoring guarded by platform detection and fail-safe fallbacks.

### Phase 9 Validation

- Include all apps in the placeholder regression allowlist review to ensure no TODO or fake data leaks into production builds.
- Add dedicated Vitest/pytest suites per app once implementations land.

### Phase 9 Blockers

- Real device telemetry sources required to validate the cortex-py thermal monitoring in CI.

---

## Phase 10 – Slash Commands, Hooks, and Tool Binding

| Area | Test | Status | Action |
| --- | --- | --- | --- |
| Slash commands | `packages/commands/tests/slash-integration.test.ts` | ⚪ todo | End-to-end `/help`, `/agents`, `/model`, `/compact` coverage |
| Hook filesystem | `packages/hooks/tests/filesystem-config.test.ts` | ⚪ todo | `.cortex/hooks/**` YAML hot reload |
| Agent templates | `packages/agents/tests/file-agent-loader.test.ts` | ⚪ todo | `.cortex/agents/**` to LangGraph subgraph compilation |
| Kernel binding | `packages/kernel/tests/tool-binding.test.ts` | ⚪ todo | `bindKernelTools()` returns complete tool set |

### Phase 10 Implementation

#### Work Completed
- ☐ None yet – slash command orchestration is queued behind planning phases.

#### Fixes Outstanding
- [ ] Implement `.cortex/commands`, `.cortex/hooks`, and `.cortex/agents` loaders with the documented precedence rules (project overrides user).
- [ ] Extend `bindKernelTools` so it stitches shell, filesystem, and web fetch tools with strict allow-lists and timeout enforcement.
- [ ] Surface command metadata (allowed tools, preferred models) into the orchestration state so LangGraph migrations remain policy-aligned.

### Phase 10 Validation

- Create Vitest suites covering slash command flows (`packages/commands/tests/slash-integration.test.ts`) plus loader hot-reload behaviours.
- Add kernel binding tests to guarantee `bindKernelTools()` returns the full sanctioned toolset.

### Phase 10 Blockers

- Pending finalisation of the `.cortex` directory schema across existing projects.

---

## Phase 11 – Enhanced Planning & Coordination (DSP Roadmap)

| Test | Status | Action |
| --- | --- | --- |
| `packages/orchestration/tests/dsp/long-horizon-planner.test.ts` | ⚪ todo | Validate planning phases, adaptive depth, and context isolation |
| `packages/orchestration/tests/dsp/context-manager.test.ts` | ⚪ todo | Ensure planning contexts quarantine correctly |
| `packages/orchestration/tests/coordination/adaptive-strategy.test.ts` | ⚪ todo | Adaptive coordination picks strategy based on capability + history |
| `packages/orchestration/tests/coordination/structured-planning-integration.test.ts` | ⚪ todo | Long-horizon planner integrates with multi-agent orchestration |

### Phase 11 Implementation

#### Work Completed
- ☐ None yet – DSP integration is awaiting dedicated planning modules.

#### Fixes Outstanding
- [ ] Extend `packages/orchestration/src/lib/long-horizon-planner.ts` with persistence hooks once desired behaviour is codified in tests.
- [ ] Implement a `PlanningContextManager` to isolate context windows and trim stale history between planning phases.
- [ ] Create `AdaptiveCoordinationManager` and supporting `strategy-selector` utilities with telemetry and `brAInwav` branding.
- [ ] Integrate the planners into orchestration workflows so planning outputs synchronise with LangGraph state transitions.

### Phase 11 Validation

- Add focussed DSP suites to CI: `pnpm --filter @cortex-os/orchestration exec vitest run "tests/dsp/**/*.test.ts"` once tests exist.

### Phase 11 Blockers

- Finalising DSP module APIs to prevent churn across orchestration and planner packages.

---

## Phase 12 – MCP Workspace & Planning Tools

| Test | Status | Action |
| --- | --- | --- |
| `packages/mcp-core/tests/tools/workspace-tools.test.ts` | ⚪ todo | Workspace create/ls/read/write with isolation |
| `packages/mcp-core/tests/tools/planning-tools.test.ts` | ⚪ todo | Planning toolchain integrates with DSP |
| `packages/mcp-core/tests/tools/coordination-tools.test.ts` | ⚪ todo | Coordination tools respect security + isolation |

### Phase 12 Implementation

#### Work Completed
- ☐ None yet – MCP workspace tooling still needs scaffolding.

#### Fixes Outstanding
- [ ] Build a workspace manager with persistent storage and sandbox enforcement inside `packages/mcp-core`.
- [ ] Expose planning and coordination MCP tools that invoke orchestration planners while respecting security requirements.
- [ ] Emit A2A events with `brAInwav` attribution for every workspace/planning mutation to keep downstream systems synchronised.

### Phase 12 Validation

- Add MCP workspace/planning tool suites to CI after implementation, covering isolation boundaries and DSP integration points.

### Phase 12 Blockers

- Pending completion of Phase 11 planner APIs to integrate against.

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
| `packages/orchestration/tests/thermal/mlx-thermal-integration.test.ts` | ⚪ todo | Simulate MLX temperature spikes and assert node-level pause + brAInwav telemetry |
| `packages/orchestration/tests/thermal/model-fallback.test.ts` | ⚪ todo | Drive automatic Ollama fallback with branded logging + budget preservation |
| `apps/cortex-py/tests/langgraph-thermal-coordination.test.ts` | ⚪ todo | Validate cortex-py emits deterministic A2A thermal events consumed by LangGraph |
| `packages/orchestration/tests/thermal/thermal-recovery.test.ts` | ⚪ todo | Ensure workflows checkpoint + resume with state integrity after temperature drop |

### Phase 16 Implementation

- Extend `apps/cortex-py/src/thermal/monitor.py` to publish structured `ThermalEvent` payloads (temp, throttle hint, source) over the existing A2A bridge with brAInwav-branded messages.
- Introduce `packages/orchestration/src/langgraph/thermal/thermal-policy.ts` with deterministic threshold evaluation and cooldown timers shared across nodes via `N0State`.
- Add a LangGraph middleware in `packages/orchestration/src/langgraph/middleware/thermal-guard.ts` that pauses node execution and records checkpoint metadata when `ThermalEvent.level !== 'nominal'`.
- Wire the middleware into `StateGraph` construction so planners and tool dispatchers consult `thermal-policy` before selecting MLX-backed models, falling back to Ollama adapters while preserving token budgets.
- Persist pause + resume reasons inside `packages/orchestration/src/langgraph/state/thermal-history.ts` to guarantee resumable workflows and branded observability hooks.
- Update existing structured logging helpers to include `thermal.event`, `thermal.response`, and `brainwav_component` fields for downstream telemetry pipelines.

### Phase 16 Validation

- Create a deterministic thermal fixture in `packages/orchestration/tests/thermal/__fixtures__/mlx-telemetry.ts` used by all new Vitest suites.
- Add thermal integration to CI focus: `pnpm --filter @cortex-os/orchestration exec vitest run "tests/thermal/**/*.test.ts"` and gate merges on passing output.
- Execute `pnpm --filter @cortex-os/a2a exec vitest run tests/thermal-event-propagation.test.ts` to guarantee cortex-py → A2A → LangGraph message flow remains lossless.
- Provide manual verification notes for MLX hardware labs: `python apps/cortex-py/scripts/emit-thermal-event.py --level critical --mock` to observe orchestration throttling end-to-end.
- Extend observability snapshot script `scripts/brainwav-production-guard.ts --check thermal` to confirm new telemetry fields before release.

### Phase 16 Blockers

- Requires stable A2A event infrastructure for thermal event propagation and ordering guarantees.
- Thermal testing must coordinate with cortex-py service health checks to avoid false positives during orchestrated pauses.
- MLX + Ollama adapter abstractions need parity in budget + metrics interfaces so fallback logic does not regress existing quotas.

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

#### Test Authoring Sequence

1. Scaffold `tests/integration/full-system-langgraph.test.ts` that boots the minimal
   `createCerebrumGraph()` pipeline through the `packages/orchestration/src/langgraph/executor.ts`
   facade, wiring in dedicated test doubles (defined in the harness below) so assertions can cover
   kernel, agent, and telemetry surfaces in a single run.
2. Add `tests/integration/production-readiness.test.ts` with targeted describe blocks for
   streaming, thermal, and multi-agent happy paths. Each block should call dedicated helpers under
   `tests/utils` (create `tests/utils/langgraph-integration.ts`) so later phases can reuse the
   same graph bootstrapping without duplicating fixture logic.
3. Author `tests/integration/failure-scenarios.test.ts` that parameterises executor failures,
   A2A outage simulation, and MCP tool rejection. Use fake timers to assert recovery windows and to
   guarantee deterministic back-off behaviour.
4. Extend the perf harness by introducing `tests/perf/langgraph-load.test.ts` which reuses the
   spool benchmark utilities (`tests/perf/spool-throughput.test.ts`) to stress the StateGraph with
   concurrent workflows, verifying `runSpool()` integration and the new load metrics described
   below.

#### Harness & Fixture Updates

- Create `tests/setup/langgraph-integration.ts` exporting a `bootstrapLanggraphTestHarness()` helper
  that composes `createCerebrumGraph()`, the `runOnce()` executor, mock thermal sensors, and
  brAInwav-branded logging sinks. Import this helper from every new integration test to avoid
  re-instantiating the tracer or event bus.
- Expand `tests/fixtures` with `langgraph/full-system.json` containing representative tool and
  message payloads captured from existing unit tests (`packages/orchestration/tests`) to keep
  integration coverage grounded in real shapes.
- Introduce deterministic WebSocket + A2A mocks under `tests/utils/websocket.ts` and
  `tests/utils/a2a-bus.ts` that emit the `brAInwav` prefixed telemetry strings required by the
  global production standards guard.

#### Observability & Metrics Instrumentation

- Extend `packages/orchestration/src/langgraph/executor.ts` with optional hooks that surface
  execution summaries (selected model, streaming status, thermal state) so the integration suite
  can assert telemetry without reaching into internal spans.
- Add a thin wrapper in `packages/orchestration/src/langgraph/spool.ts` to publish
  `brAInwav.integration.duration_ms` histograms via the existing OpenTelemetry tracer. Guard the
  new instrumentation behind a flag consumed by the integration tests to keep unit benchmarks
  stable.
- Wire the perf test to write sample metrics into `performance-history.json` through the existing
  `scripts/perf-autotune.mjs` interface, ensuring regressions can be detected once CI adopts the new
  target.

### Phase 18 Validation

- Add integration testing to release pipeline: `pnpm test:integration:langgraph`
- Include performance regression testing that maintains baseline metrics in `performance-history.json`
- Validate production readiness criteria before any deployment approvals

#### Validation Checklist

- Add a root `package.json` script that expands `pnpm test:integration:langgraph` into
  `vitest run tests/integration/**/*.test.ts --config tests/vitest.config.ts`, then document this in
  `README.md` once the suite lands.
- Update `scripts/nx-smart.mjs` presets so the `test:smart` pipeline can call the new script with
  `--focus @cortex-os/orchestration,@cortex-os/agents,@cortex-os/a2a` ensuring graph, agent, and bus
  packages are rebuilt before integration runs.
- Record performance snapshots by executing `pnpm --filter @cortex-os/orchestration exec vitest run \
  tests/perf/langgraph-load.test.ts --config tests/perf/vitest.config.ts` and appending the metrics
  artifacts to `performance-history.json`.
- Gate production readiness with a new smoke wrapper `pnpm test:integration:langgraph --reporter
  junit` so CI uploads structured results alongside existing regression suites.

### Phase 18 Blockers

- Requires completion of all previous phases for comprehensive integration testing
- Production testing requires access to representative hardware and infrastructure
- Synthetic load requires a stable mock of the thermal monitoring stack from `cortex-py`; without
  its async event bridge the failure scenarios cannot assert cooling pathways.
- Observability hooks rely on the OpenTelemetry tracer initialisation that currently lives in the
  legacy orchestration bootstrap. Extracting a lightweight initialiser is a prerequisite before the
  integration harness can bind spans in isolation.

---

## Phase 19 – brAInwav Code Mode Integration (Multi-Language)

| Test | Status | Action |
| --- | --- | --- |
| `packages/mcp-core/tests/typescript-api-generator.test.ts` | ⚪ todo | TypeScript MCP-to-API code generation with brAInwav branding |
| `packages/cortex-mcp/tests/python-code-executor.test.ts` | ⚪ todo | Python code execution environment with pyproject.toml structure |
| `apps/cortex-code/tests/rust-code-mode.test.rs` | ⚪ todo | Rust edition 2024 code mode with MCP tool integration |
| `packages/orchestration/tests/code-mode-dispatcher.test.ts` | ⚪ todo | LangGraph integration with code mode execution across languages |
| `tests/integration/multi-language-code-mode.test.ts` | ⚪ todo | Cross-language code mode orchestration with A2A events |

[documents to reference](/Users/jamiecraik/.Cortex-OS/project-documentation/code-mode/README.md)

### Phase 19 Tests to Write First

1. `packages/mcp-core/tests/typescript-api-generator.test.ts`
   - Generate a synthetic MCP server manifest, invoke the generator, and snapshot the emitted TypeScript namespace to ensure deterministic method signatures, brAInwav JSDoc, and runtime dispatch wiring.
   - Assert that the runtime shim proxies through `dispatchTools` with the provided tool name and payload, failing if any placeholder strings or missing branding appear.
   - Cover error-path behaviour by simulating an unknown tool reference and verifying the thrown `CodeModeDispatchError` includes brAInwav attribution.
2. `packages/cortex-mcp/tests/python-code-executor.test.ts`
   - Build a temporary FastMCP workspace and assert that generated modules create a compliant `pyproject.toml`, dependency lock, and async client wrapper.
   - Validate execution by running an async coroutine that batches tool calls, confirming thermal hooks emit `brAInwav thermal` log lines and respect safety timeouts.
   - Add failure-mode coverage where AST validation rejects disallowed imports, ensuring the executor raises branded `CodeModeSecurityError` exceptions.
3. `apps/cortex-code/tests/rust-code-mode.test.rs`
   - Drive the Rust code generator with a manifest containing filesystem and observability tools, asserting the emitted crate opts into edition 2024 and uses sandboxed temp directories.
   - Mock the MCP transport to confirm the generated async functions issue real protocol requests and map structured errors into `CodeModeExecutionError` with brAInwav context.
   - Exercise parallel execution by spawning rayon tasks and verifying telemetry spans are produced for each batch.
4. `packages/orchestration/tests/code-mode-dispatcher.test.ts`
   - Construct an N0State fixture with queued code-mode actions for TypeScript, Python, and Rust, ensuring the dispatcher selects the appropriate runtime and forwards traces to `dispatchTools`.
   - Assert language fallbacks trigger when thermal or sandbox constraints fire, updating N0State with the downgraded language and branded audit trail.
5. `tests/integration/multi-language-code-mode.test.ts`
   - Launch orchestrated workflows that mix language runtimes, verifying A2A events broadcast completion metadata, thermal signals, and failure telemetry with brAInwav prefixes.
   - Confirm token-efficiency metrics and wall-clock timings are recorded in `performance-history.json` for benchmarking comparisons against traditional tool calls.

### Phase 19 Implementation

#### TypeScript Code Mode Generator

- Create `packages/mcp-core/src/codegen/typescript-api-generator.ts` that converts MCP server specifications into TypeScript APIs
- Implement runtime dispatcher that maps function calls to `dispatchTools` from orchestration package, exposing helpers for single, batch, and streaming tool invocations
- Emit deterministic file layout (`index.ts`, `runtime.ts`, `manifest.d.ts`) so vitest snapshots stay stable and code mode imports remain predictable
- Integration with existing N0State and LangGraph workflows through a `registerCodeModeRuntime` helper that binds runtimes to session metadata

```typescript
// Generated brAInwav TypeScript API example
export namespace FileSystemAPI {
  export async function read(path: string): Promise<string> {
    return await __runtime__.dispatch('filesystem_read', { path });
  }
  
  export async function write(path: string, content: string): Promise<void> {
    return await __runtime__.dispatch('filesystem_write', { path, content });
  }
}

// Model generates efficient orchestration code:
const files = await FileSystemAPI.listDir('/src');
for (const file of files.filter(f => f.endsWith('.ts'))) {
  const content = await FileSystemAPI.read(file);
  const analysis = await CodeAnalysisAPI.analyze(content);
  if (analysis.quality < 0.8) {
    await GitHubAPI.createIssue({
      title: `brAInwav: Code quality issue in ${file}`,
      body: `Quality score: ${analysis.quality}`
    });
  }
}
```

#### Python Code Mode with FastMCP Integration

- Enhance `packages/cortex-mcp/cortex_fastmcp_server_v2.py` with code generation and execution tools
- Create `packages/cortex-mcp/codegen/python_api_generator.py` following pyproject.toml structure and emitting async client wrappers under `code_mode/generated`
- Safe code execution environment with thermal monitoring integration, AST-based sandboxing, and explicit allow-list for builtins/imports
- A2A event integration for cross-language coordination, including `code_mode.runtime_started` and `code_mode.runtime_failed` events tagged with language/runtime IDs
- Persist execution metadata (duration, token counts, thermal state) to the FastMCP telemetry sink so regression tests can assert deterministic outputs

```python
# Generated brAInwav Python API example
class EmbeddingAPI:
    async def generate(self, text: str) -> Dict[str, Any]:
        """Generate embedding - brAInwav powered."""
        return await self._client.call_tool("embedding.generate", {"text": text})
    
    async def batch(self, texts: List[str]) -> Dict[str, Any]:
        """Generate batch embeddings - brAInwav powered."""
        return await self._client.call_tool("embedding.batch", {"texts": texts})

# Model generates efficient batch processing:
files = await filesystem.list_dir('/documents')
for batch in chunks(files, 50):  # Efficient batching
    contents = [await filesystem.read(f) for f in batch]
    embeddings = await embedding.batch(contents)  # Single API call
    
    # Thermal awareness
    thermal_status = await thermal.get_status()
    if thermal_status['temperature'] > 75:
        print("brAInwav thermal management: cooling down...")
        await asyncio.sleep(30)
```

#### Rust Code Mode with Edition 2024

- Add `CodeModeTool` to `apps/cortex-code/codex-rs/mcp-server/src/tools.rs`
- Create `apps/cortex-code/codex-rs/mcp-server/src/code_generator.rs` for Rust API generation, emitting crates under `.code_mode/<session>` with Cargo manifests and lockfiles
- Safe code execution with temporary Cargo projects using edition 2024, sandboxed filesystem permissions, and configurable CPU/memory ceilings surfaced via environment variables
- Integration with existing A2A stdio bridge pattern plus structured logging so downstream analytics capture compile/run phases with brAInwav attribution
- Provide a `cleanup_stale_projects` routine invoked post-execution to prune temp workspaces, ensuring repeated tests remain deterministic

```rust
// Generated brAInwav Rust API example
pub struct CortexAPI {
    mcp_server_path: String,
    brainwav_session: bool,
}

impl CortexAPI {
    pub async fn file_read(&self, path: &str) -> Result<String> {
        // Execute via MCP protocol with brAInwav attribution
    }
    
    pub async fn code_analyze(&self, file_path: &str) -> Result<AnalysisResult> {
        // Code analysis with brAInwav metrics
    }
}

// Model generates efficient Rust code:
let files: Vec<_> = fs::read_dir("./src")?
    .filter_map(|entry| entry.ok())
    .filter(|entry| entry.path().extension() == Some("rs"))
    .collect();

// Parallel processing with rayon
files.par_iter()
    .map(|file| {
        let content = fs::read_to_string(file)?;
        analyze_rust_code(&content) // brAInwav analysis
    })
    .collect::<Result<Vec<_>>>()?;
```

#### LangGraph Integration

- Create code mode execution nodes that support all three languages, modelling each runtime as a subgraph node with explicit success/failure edges
- Enhance `packages/orchestration/src/langgraph/code-mode-node.ts` with language-specific runtime adapters, telemetry spans, and branded status messages for UI streaming
- Cross-language state sharing via N0State adapters, persisting execution transcripts, performance metrics, and fallback history in a normalized structure
- Thermal-aware execution with automatic language fallbacks that update orchestration budgets, trigger A2A thermal alerts, and annotate subsequent planner steps with mitigation strategies
- Provide deterministic seed management and sandbox capability negotiation so tests can stub runtime availability without modifying production code paths

### Phase 19 Validation

- Add code mode testing to CI: `pnpm test:code-mode:all-languages` (executes TypeScript, Python, and Rust suites with deterministic manifests)
- Provide targeted commands for local focus:
  - `pnpm --filter @cortex-os/mcp-core exec vitest run tests/typescript-api-generator.test.ts`
  - `pnpm --filter @cortex-os/cortex-mcp exec vitest run tests/python-code-executor.test.ts`
  - `cargo test -p codex-mcp-server --test rust-code-mode`
  - `pnpm --filter @cortex-os/orchestration exec vitest run tests/code-mode-dispatcher.test.ts`
  - `pnpm exec vitest --config tests/integration/vitest.config.ts run tests/integration/multi-language-code-mode.test.ts`
- Include performance benchmarks comparing tool calls vs code mode efficiency and record deltas in `performance-history.json`
- Validate brAInwav branding in all generated APIs and execution outputs via snapshot assertions and structured log inspection
- Test thermal coordination across TypeScript, Python, and Rust components, ensuring A2A events and fallback pathways are exercised in automation

### Phase 19 Blockers

- Requires stable MCP infrastructure across all three language implementations, including manifest discovery and credential management exposed by `packages/mcp-core`
- Code execution security must be validated for safe model-generated code; complete threat modeling and integrate Semgrep/static checks before enabling CI gating
- Cross-language A2A event coordination needs comprehensive testing, especially for retries and network partitions when runtimes emit `code_mode.runtime_failed`
- Performance benchmarking harness depends on `scripts/perf-autotune.mjs` consuming new metrics; ensure telemetry format changes are backward compatible

---

## Governance & Metrics

- Continue using `pnpm lint:smart`, `pnpm typecheck:smart`, and targeted `pnpm test:smart --focus <pkg>` once per phase
- Record spool/dispatch performance changes in `performance-history.json`; retune with `scripts/perf-autotune.mjs`
- Enforce CODESTYLE (`≤40` line functions, named exports only, async/await) while refactoring legacy modules
- **Code mode benchmarking**: Track token efficiency gains and execution performance compared to traditional tool calling
- **Cross-language consistency**: Ensure brAInwav branding and API patterns are consistent across TypeScript, Python (pyproject.toml), and Rust (edition 2024) implementations
- **Security validation**: All generated code execution must pass security scanning and sandboxing requirements

## Known Issues to Resolve en Route

1. **TypeScript compilation failures** – `packages/orchestration/src/langgraph/streaming.ts` and `src/intelligence/adaptive-decision-engine.ts` still block `tsc --noEmit`
2. **Vitest module aliasing** – `@cortex-os/model-gateway` mock must be resolvable so `n0-shim.integration.test.ts` can run
3. **Slash command coverage** – No automated guarantee that `/` commands bypass the parent model path
4. **Spool/dispatch telemetry** – Lacks OpenTelemetry spans (`n0.tool_dispatch`, `n0.spool`) referenced in analytics
5. **LangGraph streaming infrastructure** – WebSocket connections need resilience patterns for production streaming
6. **Thermal event propagation** – A2A event bus must handle thermal events with proper priority and routing
7. **Multi-agent state conflicts** – N0State merging across concurrent workflows requires conflict resolution strategies
8. **Production observability** – All new phases require comprehensive brAInwav-branded metrics and error tracking
9. **Code mode security** – Generated code execution requires sandboxing and validation across TypeScript, Python, and Rust environments
10. **Cross-language API generation** – MCP-to-code generators must maintain type safety and brAInwav branding consistency
11. **Code mode performance validation** – Benchmarking required to confirm efficiency gains over traditional tool calling
12. **Multi-language thermal coordination** – Thermal events must trigger appropriate responses across TypeScript, Python (pyproject.toml), and Rust (edition 2024) execution contexts

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
- **brAInwav Code Mode Integration** successfully converts MCP tool calls to executable code across TypeScript, Python (pyproject.toml), and Rust (edition 2024)
- **Cross-language code orchestration** enables efficient batch operations, loops, and complex logic instead of individual tool calls
- **Code mode performance benefits** demonstrate 3-5x token efficiency and faster execution compared to traditional tool calling
- **Multi-language thermal coordination** provides intelligent fallbacks and resource management across TypeScript, Python, and Rust execution environments
- Final smoke test executes `/agents/execute` through LangGraph → dispatch → spool → PRP → MCP, persisting data and streaming outputs without mocks
- **Code mode validation** confirms generated APIs work seamlessly with existing orchestration, A2A events, and thermal monitoring
- **brAInwav enterprise readiness**: All components include proper branding, observability, and production-grade error handling across all language implementations

<!-- markdownlint-enable MD013 -->
