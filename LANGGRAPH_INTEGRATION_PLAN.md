# LangGraph Integration Plan – TDD Roadmap for n0 Master Agent Loop

<!-- markdownlint-disable MD013 -->

## Objective

Drive the Cortex-OS LangGraph migration through **state unification → tool dispatch → spool orchestration**, leveraging existing mature components instead of rebuilding from scratch. This plan merges the remaining action items in `final-cortex-tdd-plan.md` and `cortex-enhancement-tdd-plan.md`, aligns them with the current codebase, and sequences every task around strict TDD.

Each phase documents:

1. **Failing test(s) to author first** (exact file paths with current status)
2. **Implementation pairing** (code required to turn tests green)
3. **Validation hooks** (commands/checks to keep regressions out)
4. **Blockers / accuracy notes** (ground-truth facts from today’s repo)

## Current State Snapshot (2025-09-26)

- ✅ Shared `N0State` schema (`packages/orchestration/src/langgraph/n0-state.ts`) and adapters (`n0-adapters.ts`) exist with passing coverage in `packages/orchestration/tests/n0-state-contract.test.ts`
- ✅ Kernel projection shim is exercised by `packages/kernel/tests/n0-projection.test.ts`
- 🔴 `packages/agents/tests/unit/n0-shim.integration.test.ts` is present but fails because Vitest cannot resolve `@cortex-os/model-gateway` without an alias
- ⚠️ Tool dispatch and spool implementations (`tool-dispatch.ts`, `spool.ts`) exist with no automated tests; budget enforcement is unverified
- ⚠️ `pnpm --filter @cortex-os/agents typecheck` now passes after adapter fixes; `pnpm --filter @cortex-os/orchestration typecheck` still fails (duplicate exports, missing deps)
- ⚠️ Slash command runner lives in `packages/commands/src/index.ts`; no end-to-end tests ensure `/help`, `/agents`, `/model`, `/compact` short-circuit LangGraph
- ✅ Placeholder regression guard (`tests/regression/placeholders.spec.ts`) and branded random ban (`tests/regression/math-random-ban.spec.ts`) are green with the 135-hit legacy baseline
- ⚠️ Dynamic Speculative Planner (`packages/orchestration/src/utils/dsp.ts`) and Long-Horizon Planner (`src/lib/long-horizon-planner.ts`) are implemented but lack unit/integration coverage

---

## Phase 0 – Global Guardrails

| Test | Status | Notes |
| --- | --- | --- |
| `tests/regression/placeholders.spec.ts` | ✅ in repo | Baseline fixture maintained at 135 legacy hits |
| `tests/contracts/openapi-sync.spec.ts` | ⚪ todo | Must compare generated OpenAPI to Express handlers before API work |
| `packages/mcp-core/tests/tools-contract.test.ts` | ⚪ todo | Prevent `'mock'` adapters from shipping |

**Implementation pairing**

- Keep `scripts/brainwav-production-guard.ts` wired in CI
- Generate OpenAPI from Zod schemas and ensure every route handler exports real implementations
- Harden MCP tool registry to reject placeholder adapter values

**Validation hooks**

- Require `pnpm test:placeholders && pnpm test --filter contracts` locally before PR

**Blockers / accuracy notes**

- Updating the placeholder baseline must accompany any new detections to avoid false failures

---

## Phase 1 – State Unification (Migration Step 1)

| Test | Status | Action |
| --- | --- | --- |
| `packages/orchestration/tests/n0-state-contract.test.ts` | ✅ passes | Keep covering new adapters/fields as they land |
| `packages/kernel/tests/n0-projection.test.ts` | ✅ passes | Extend expectations when kernel adds new workflow metadata |
| `packages/agents/tests/unit/n0-shim.integration.test.ts` | 🔴 failing | Add Vite/Vitest alias for `@cortex-os/model-gateway` (or ship ESM stub) so the shim can resolve adapters |

**Implementation pairing**

- Ship Vitest config (or inline alias) that resolves `@cortex-os/model-gateway` for unit tests; ensure shim exercises real hook integration once hooks singleton exists
- Finish adapter coverage in `packages/orchestration/src/langgraph/n0-adapters.ts` for PRP, CortexAgent, A2A states (current tests only cover available shapes)
- Backfill state merge helpers with cross-package assertions (agents ↔ kernel ↔ orchestration) using the shared schema
- Fix TypeScript blockers in `packages/orchestration/src/langgraph/streaming.ts` and `src/intelligence/adaptive-decision-engine.ts` so `pnpm --filter @cortex-os/orchestration typecheck` can pass alongside agents

**Validation hooks**

- Add to CI focus: `pnpm --filter @cortex-os/orchestration exec vitest run tests/n0-state-contract.test.ts`
- Pair with `pnpm --filter @cortex-os/agents exec vitest run tests/unit/n0-shim.integration.test.ts` once alias is wired

**Blockers / accuracy notes**

- Without resolving the model-gateway alias, the shim test will continue to crash before assertions

---

## Phase 2 – Tool Dispatch Consolidation (Migration Step 2)

| Test | Status | Action |
| --- | --- | --- |
| `packages/orchestration/tests/tool-dispatch.budget.test.ts` | ⚪ todo | Create to verify time/token budgets, allow-lists, and hook deny flows |
| `packages/hooks/tests/tool-dispatch-hooks.test.ts` | ⚪ todo | Ensure Pre/Post hook mutations propagate through dispatch |
| `tests/regression/tool-dispatch-allowlist.test.ts` | ⚪ todo | Guard slash-command metadata so disallowed tools never execute |

**Implementation pairing**

- Ensure `dispatchTools` logs and surfaces `brAInwav`-branded errors for policy denials, skips, and hook actions
- Propagate slash command `allowed-tools` metadata into the N0 session so dispatch enforces allow-lists automatically
- Remove direct MLX/Ollama adapter invocations; require all tool/subagent calls to route through `dispatchTools`
- Add structured logging + telemetry (`@cortex-os/observability`) for dispatch start/settle events

**Validation hooks**

- New smart target: `pnpm test:smart --focus @cortex-os/orchestration,@cortex-os/hooks -- --filter "tool-dispatch"`

**Blockers / accuracy notes**

- `dispatchTools` currently lacks partial-failure semantics; design outcome aggregation (fulfilled/rejected/skipped) before writing tests

---

## Phase 3 – Spool & Parallel Execution (Migration Step 3)

| Test | Status | Action |
| --- | --- | --- |
| `packages/orchestration/tests/spool-settled.test.ts` | ⚪ todo | Validate `runSpool` respects deadlines, token budgets, and abort signals |
| `packages/prp-runner/tests/spool-integration.test.ts` | ⚪ todo | Ensure PRP fan-out uses spool and surfaces deterministic ordering |
| `tests/perf/spool-throughput.test.ts` | ⚪ todo | Capture throughput metrics and append to `performance-history.json` |

**Implementation pairing**

- Extend `runSpool` with per-task start callbacks that emit `brAInwav` telemetry and enforce concurrency limits deterministically
- Wire spool into `agent.autodelegate` and PRP runner so parallel fan-out is centrally managed
- Implement cancellation propagation (AbortController) and ensure rejection reasons include budgets in error messages

**Validation hooks**

- After tests exist, run `node scripts/perf-autotune.mjs performance-baseline.json performance-history.json --window 15 --headroom 30`

**Blockers / accuracy notes**

- Current worker loop never touches `onStart`; update implementation in tandem with tests to avoid regressions

---

## Phase 4 – API Server & Auth Hardening

| Test | Status | Action |
| --- | --- | --- |
| `apps/api/tests/routing/apiRoutes.spec.ts` | ✅ passes | Keep snapshots aligned with Prisma payloads |
| `apps/api/tests/auth/persistence.spec.ts` | ⚠️ skipped | Requires Docker runtime + Prisma adapter instead of in-memory |
| `apps/api/tests/auth/features.spec.ts` | ⚪ todo | Cover profile update, session revoke, 2FA, passkey flows |

**Implementation pairing**

- Replace in-memory Better Auth adapter with Prisma-backed adapter in `apps/api/src/auth/database-adapter.ts`
- Flesh out `/api/v1` route modules with Zod validation + service layer; tie telemetry metrics to real collectors
- Ensure health endpoints surface real queue/db metrics (no static numbers)

**Validation hooks**

- `pnpm prisma:migrate:dev --preview-feature --name auth-hardening`
- Add Supertest snapshots to prevent placeholder regressions

**Blockers / accuracy notes**

- `apps/api/tests/auth/persistence.spec.ts` currently skips when Docker is unavailable; ensure CI runner supports TestContainers

---

## Phase 5 – Master Agent Execution & Health

| Test | Status | Action |
| --- | --- | --- |
| `services/orchestration/tests/master-agent.exec.spec.ts` | ⚪ todo | Replace mock adapter assertions with real dispatch spies |
| `services/orchestration/tests/langgraph.integration.spec.ts` | ⚪ todo | Boot LangGraph harness and verify node logs |
| `services/orchestration/tests/health/pool-health.spec.ts` | ⚪ todo | Ensure metrics return live pool counts |
| `packages/orchestration/tests/adapters/stability.test.ts` | ⚪ todo | Protect adapter fallbacks & retries |

**Implementation pairing**

- Inject MLX/Ollama adapters via dependency injection so tests can spy on dispatch calls
- Replace static pool metrics with queue + heartbeat instrumentation
- Resolve outstanding orchestration `tsc` errors to unblock test execution

**Validation hooks**

- Extend `pnpm test:agents` to execute orchestrated plan fixtures once tests exist

**Blockers / accuracy notes**

- Without fixing TypeScript errors, affected Vitest suites cannot run in CI

---

## Phase 6 – Memories Service Reliability

| Test | Status | Action |
| --- | --- | --- |
| `packages/memories/tests/k-v-store.integration.test.ts` | ⚪ todo | Matrix over SQLite, Prisma, Local Memory |
| `packages/memories/tests/health-report.test.ts` | ⚪ todo | Ensure `/memories/stats` reflects active backend |
| `tests/e2e/memories.health.test.ts` | ⚪ todo | Docker Compose matrix smoke |

**Implementation pairing**

- Complete Qdrant adapter in `packages/memories/src/adapters/store.qdrant.ts`
- Wire health endpoint to adapter-specific stats with brAInwav branding

**Validation hooks**

- Add `pnpm --filter @cortex-os/memories exec vitest run` to smart CI focus when tests exist

---

## Phase 7 – A2A Streaming & Outbox

| Test | Status | Action |
| --- | --- | --- |
| `packages/a2a/tests/validation/sanitization.test.ts` | ⚪ todo | Recursive sanitization without mutating safe fields |
| `packages/a2a/tests/streaming/mcp-subscription.test.ts` | ⚪ todo | SSE/WebSocket stream assertions |
| `packages/a2a/tests/outbox/retry-tool.test.ts` | ⚪ todo | Deterministic retry/backoff without `Math.random()` |
| `services/orchestration/tests/outbox.retry.spec.ts` | ⚪ todo | Confirm orchestration honours retry policy |

**Implementation pairing**

- Implement sanitization, SSE streaming, and deterministic retries with metrics instrumentation
- Ensure all outputs/logs carry `brAInwav` branding

**Validation hooks**

- Include `pnpm test:a2a` in CI once suites exist

---

## Phase 8 – Evidence Enhancement & MCP Bridge

| Test | Status | Action |
| --- | --- | --- |
| `packages/evidence-runner/tests/enhancement.test.ts` | ⚪ todo | Ensure `enhanceEvidence` enriches output |
| `packages/mcp-bridge/tests/browser-executor.test.ts` | ⚪ todo | Playwright-driven DOM extraction |
| `packages/mcp-bridge/tests/database-executor.test.ts` | ⚪ todo | Parameterised SQL execution |
| `packages/mcp-core/tests/tool-mapping.test.ts` | ⚪ todo | Safe fallback for unknown tool types |

**Implementation pairing**

- Integrate MLX/remote LLMs for evidence enhancement with deterministic configs
- Wire Playwright + database executors with real drivers and secure parameterisation
- Expand tool mappings and add telemetry/logging

**Validation hooks**

- Add `pnpm test:mcp:smoke` gated by `PLAYWRIGHT=1`

---

## Phase 9 – Apps Production Readiness

| Test | Status | Action |
| --- | --- | --- |
| `apps/api/tests/routing-completeness.test.ts` | ⚪ todo | Fail when TODO routes remain |
| `apps/cortex-marketplace/tests/mcp-implementation.test.ts` | ⚪ todo | Verify nine MCP tools return real data |
| `apps/cortex-os/tests/metrics-reality.test.ts` | ⚪ todo | Ensure no `Math.random()` metrics |
| `apps/cortex-py/tests/thermal-guard-production.test.ts` | ⚪ todo | Cross-platform thermal monitoring |

**Implementation pairing**

- Complete Marketplace MCP service integrations
- Replace fake metrics with real system probes
- Implement thermal monitoring with platform guards

**Validation hooks**

- Include apps directory in placeholder regression allowlist review

---

## Phase 10 – Slash Commands, Hooks, and Tool Binding

| Area | Test | Status | Action |
| --- | --- | --- | --- |
| Slash commands | `packages/commands/tests/slash-integration.test.ts` | ⚪ todo | End-to-end `/help`, `/agents`, `/model`, `/compact` coverage |
| Hook filesystem | `packages/hooks/tests/filesystem-config.test.ts` | ⚪ todo | `.cortex/hooks/**` YAML hot reload |
| Agent templates | `packages/agents/tests/file-agent-loader.test.ts` | ⚪ todo | `.cortex/agents/**` to LangGraph subgraph compilation |
| Kernel binding | `packages/kernel/tests/tool-binding.test.ts` | ⚪ todo | `bindKernelTools()` returns complete tool set |

**Implementation pairing**

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

**Implementation pairing**

- Extend `packages/orchestration/src/lib/long-horizon-planner.ts` with persistence hooks once tests define behaviour
- Implement `PlanningContextManager` for isolation and history trimming
- Create `AdaptiveCoordinationManager` and `strategy-selector` modules with telemetry + brAInwav branding
- Integrate planners with orchestration workflows so planning phases flow into LangGraph state

**Validation hooks**

- Add focussed DSP suite to CI: `pnpm --filter @cortex-os/orchestration exec vitest run "tests/dsp/**/*.test.ts"`

---

## Phase 12 – MCP Workspace & Planning Tools

| Test | Status | Action |
| --- | --- | --- |
| `packages/mcp-core/tests/tools/workspace-tools.test.ts` | ⚪ todo | Workspace create/ls/read/write with isolation |
| `packages/mcp-core/tests/tools/planning-tools.test.ts` | ⚪ todo | Planning toolchain integrates with DSP |
| `packages/mcp-core/tests/tools/coordination-tools.test.ts` | ⚪ todo | Coordination tools respect security + isolation |

**Implementation pairing**

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

**Implementation pairing**

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

**Implementation pairing**

- Expand `PromptTemplateManager` default templates with measurable examples
- Add effectiveness tracking and adaptive prompt selection logic tied to context
- Ensure all prompts include brAInwav branding and nO behaviour guidelines

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

## Definition of Done

- All tests above implemented via fail-first TDD and committed alongside code
- `pnpm lint:smart && pnpm typecheck:smart && pnpm test:smart` succeed with no legacy skips
- No routes, tools, or adapters emit placeholder strings (guards + targeted tests confirmed)
- N0 graph streams telemetry + logs with brAInwav branding at every node (parse → hooks → plan → dispatch → spool → stream)
- Slash commands, hooks, agents, and kernel surface share the same allow-list + budgeting contracts
- Advanced planners, security integrations, and MCP toolsets operate under automated coverage
- Documentation reflects real implementations and is cross-checked by guard scripts
- Final smoke test executes `/agents/execute` through LangGraph -> dispatch -> spool -> PRP -> MCP, persisting data and streaming outputs without mocks

<!-- markdownlint-enable MD013 -->
