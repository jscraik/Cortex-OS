# LangGraph Integration Plan – TDD Roadmap for n0 Master Agent Loop

<!-- markdownlint-disable MD013 -->

## Objective

Align every Cortex-OS surface with the n0 (Master Agent Loop) blueprint using strict Test-Driven Development. The plan below merges the remaining tasks from the **Final brAInwav Cortex-OS TDD Plan** with the architectural gaps identified in the **n0 enhancement analysis**. Each phase lists:

1. **Failing tests to author first** (exact file paths)
2. **Implementation pairing** (code that must satisfy the tests)
3. **Validation hooks** (guards that keep behaviour locked once green)
4. **Known blockers / accuracy notes** to keep the roadmap factual against the current codebase

## Current State Snapshot (2025-09-26)

- Shared `N0State` schema + adapters live in `@cortex-os/orchestration` (`src/langgraph/n0-state.ts`, `n0-adapters.ts`)
- Initial spool runner and hook-aware tool dispatcher implemented (`src/langgraph/spool.ts`, `tool-dispatch.ts`) but **no automated tests yet**
- `MasterAgent` and `CortexAgent` now expose `coordinateWithN0` / `executeWithN0`; direct adapter invocations still bypass budget enforcement without tests
- `packages/commands` uses `crypto.randomUUID` and ships slash command runner; dedicated command/node integration tests remain outstanding
- TypeScript type checks currently fail for unrelated legacy code (`packages/orchestration`, `packages/agents`) — these are flagged as gating issues below
- Placeholder regression harness (`tests/regression/placeholders.spec.ts`) exists with 135 legacy hits baseline

## Phase 0 – Global Guardrails (In-flight)

| Test | Status | Notes |
| --- | --- | --- |
| `tests/regression/placeholders.spec.ts` | ✅ existing | Baseline maintained; ensure new phases keep fixture updated |
| `tests/contracts/openapi-sync.spec.ts` | ⚪ todo | Verifies generated OpenAPI vs Express handlers; required before API work |
| `packages/mcp-core/tests/tools-contract.spec.ts` | ⚪ todo | Ensures MCP tools reference concrete adapters |

**Implementation pairing**

- Keep `scripts/brainwav-production-guard.ts` wired in CI (already done)
- Add OpenAPI generation & schema sync to `apps/api`
- Harden MCP tool registry to reject `'mock'` strings

**Validation hooks**

- Extend CI to run `pnpm test:placeholders && pnpm test --filter contracts`

**Blockers / Accuracy Notes**

- Ensure new investigations record any additional placeholder hits in the baseline fixture; guard rails stop PRs otherwise

## Phase 1 – State Unification

**Failing tests to write first**

- `packages/orchestration/tests/n0-state-contract.spec.ts`
- `packages/agents/tests/n0-shim.integration.spec.ts`
- `packages/kernel/tests/n0-projection.spec.ts`

**Implementation pairing**

- Backfill tests for `createInitialN0State`, `mergeN0State`
- Add adapters for remaining annotations (CortexAgent streaming, PRP workflows) and ensure they round-trip messages
- Ensure exported helpers (`coordinateWithN0`, `executeWithN0`, `projectKernelWorkflowToN0`) are covered

**Validation hooks**

- Add `pnpm --filter @cortex-os/orchestration exec vitest run tests/n0-state-contract.spec.ts` to CI focus workflow once files exist

**Blockers / Accuracy Notes**

- TypeScript compilation currently fails for agents/orchestration (legacy files: `langgraph/streaming.ts`, `adaptive-decision-engine.ts`); fixing these is prerequisite for green test runs

## Phase 2 – Tool Dispatch Consolidation

**Failing tests to write first**

- `packages/orchestration/tests/tool-dispatch.budget.spec.ts` – enforces time/token limits, allow-lists, hook emissions
- `packages/hooks/tests/tool-dispatch-hooks.spec.ts` – Pre/Post hook triggers with deny/mutate scenarios
- `tests/regression/tool-dispatch-allowlist.spec.ts` – ensures slash command metadata constrains tool usage

**Implementation pairing**

- Cover `dispatchTools` happy/error paths and ensure `MasterAgent` resp. aggregator returns deterministic errors when hooks deny runs
- Wire slash-command metadata into orchestration session objects once tests prove failure first
- Remove direct MLX/Ollama fallbacks once dispatch layer owns routing

**Validation hooks**

- Add `pnpm test --filter "tool-dispatch"` to smart test script once in place

**Blockers / Accuracy Notes**

- `dispatchTools` currently lacks tests for partial failures; ensure new suites assert spool/skipped semantics

## Phase 3 – Spool & Parallel Execution

**Failing tests to write first**

- `packages/orchestration/tests/spool-settled.spec.ts`
- `packages/prp-runner/tests/spool-integration.spec.ts`
- `tests/perf/spool-throughput.spec.ts` (records results in `performance-history.json`)

**Implementation pairing**

- Confirm `runSpool` enforces budgets, cancels on deadline/abort, emits branded errors
- Integrate spool usage into PRP runner fan-out and `agent.autodelegate`

**Validation hooks**

- Update `scripts/perf-autotune.mjs` once throughput benchmarks exist

**Blockers / Accuracy Notes**

- Worker loop currently uses `context.options.onSettle`; tests must confirm hooks are invoked even when tasks skipped due to budgets

## Phase 4 – API Server & Auth Hardening

**Failing tests to (re)introduce**

- `apps/api/tests/routing/apiRoutes.spec.ts` – already exists; ensure it stays green with DB-backed handlers
- `apps/api/tests/auth/persistence.spec.ts` – currently scaffolded but skips without Docker; enforce running against Prisma adapter
- `apps/api/tests/auth/features.spec.ts`

**Implementation pairing**

- Replace in-memory Better Auth adapter with Prisma Postgres implementation (`apps/api/src/auth/database-adapter.ts`)
- Implement missing routes under `apps/api/src/routes/api-v1.ts` (currently untracked) with Zod schemas and service bindings
- Wire telemetry metrics to real collectors instead of placeholders

**Validation hooks**

- Run `pnpm prisma:migrate:dev` inside CI; add health-check snapshot once DB integration complete

**Blockers / Accuracy Notes**

- Several new files (`apps/api/tests/auth/persistence.spec.ts`) are untracked; ensure they match plan before committing

## Phase 5 – Master Agent Execution & Health

**Failing tests to add**

- `services/orchestration/tests/master-agent.exec.spec.ts`
- `services/orchestration/tests/langgraph.integration.spec.ts`
- `packages/services/orchestration/tests/orchestrator-health.spec.ts`
- `packages/orchestration/tests/adapters/stability.spec.ts`

**Implementation pairing**

- Inject spies into MLX/Ollama adapters confirming real invocations via `dispatchTools`
- Replace mock health data in `agent-health-monitor.ts` with actual metrics (LangGraph heartbeat, queue depth)
- Resolve TypeScript compilation errors noted earlier to unblock test harnesses

**Validation hooks**

- Extend non-null telemetry assertions so tests fail when fallback strings (e.g., “adapters unavailable”) reappear

## Phase 6 – Memories Reliability

**Failing tests to add**

- `packages/memories/tests/k-v-store.integration.spec.ts` – multi-backend matrix (SQLite, Qdrant, Local Memory)
- `packages/memories/tests/health-report.spec.ts`

**Implementation pairing**

- Implement missing Qdrant adapter (new file `src/adapters/store.qdrant.ts` is present but incomplete)
- Wire health endpoints to real store stats

**Validation hooks**

- Add `pnpm --filter @cortex-os/memories exec vitest run` to CI focus when tests are live

## Phase 7 – A2A Streaming & Outbox

**Failing tests to add**

- `packages/a2a/tests/workflow/delegation.spec.ts`
- `packages/a2a/tests/streaming-implementation.spec.ts`
- `packages/services/orchestration/tests/outbox.retry.spec.ts`

**Implementation pairing**

- Sanitize payloads, enforce branding, ensure streaming responses no longer return “snapshot only”
- Provide deterministic retry/backoff without `Math.random`

## Phase 8 – Evidence Enhancement & MCP Bridge

**Failing tests to add**

- `packages/prp-runner/tests/evidence-enhancement-reality.spec.ts`
- `packages/mcp-core/tests/tools/workspace-tools-enhanced.spec.ts`
- Playwright-based browser executor tests (per final TDD plan)

**Implementation pairing**

- Hook semgrep / evidence enhancer to real processing flows
- Implement workspace MCP tools with isolation checks

## Phase 9 – Apps Production Readiness

**Failing tests to add**

- `apps/cortex-code/tests/marketplace-tools.spec.ts`
- `apps/cortex-py/tests/thermal-guard-production.spec.ts`
- `tests/security/comprehensive-security-integration.spec.ts`

**Implementation pairing**

- Replace “Marketplace MCP” placeholders with finished adapters
- Implement cross-platform thermal monitoring (Windows, Linux, macOS)
- Ensure metrics originate from actual system probes

## Cross-Cutting Enhancements (from n0 analysis)

| Area | Tests to add | Implementation targets |
| --- | --- | --- |
| Slash commands | `packages/commands/tests/slash-integration.spec.ts` | Validate `/help`, `/agents`, `/model`, `/compact` end-to-end via orchestration |
| Hook filesystem | `packages/hooks/tests/filesystem-config.spec.ts` | `.cortex/hooks/**` YAML hot reload |
| Agent templates | `packages/agents/tests/file-agent-loader.spec.ts` | `.cortex/agents/**` to LangGraph subgraphs |
| Kernel tools | `packages/kernel/tests/tool-binding.spec.ts` | Ensure `bindKernelTools()` returns concrete tool set |
| Security MCP | `packages/cortex-sec/tests/planning/compliance-driven-planning.spec.ts` | Compliance-aware planning
| Observability | `packages/observability/tests/otel-span-contract.spec.ts` | Spans `n0.state`, `n0.tool_dispatch`, `n0.spool` emitted |

## Governance & Metrics

- Continue using `pnpm lint:smart`, `pnpm typecheck:smart`, and targeted `pnpm test:smart --focus <pkg>` once per phase
- Record new `performance-history.json` entries whenever spool or dispatch behaviour changes; retune baselines via `node scripts/perf-autotune.mjs`
- Enforce CODESTYLE (≤40-line functions, named exports only) — several legacy files violate this; refactor during implementation

## Known Issues Requiring Fix Before Closing Phases

1. **TypeScript compilation failures**
   - `packages/agents/src/langgraph/streaming.ts` (syntax errors) and `packages/orchestration/src/intelligence/adaptive-decision-engine.ts` (duplicate exports) block `tsc --noEmit`
2. **Untracked new directories**
   - `apps/api/src/routes/api-v1.ts`, `apps/api/tests/helpers/`, `packages/orchestration/tests/` need real content or removal before plan completion
3. **Slash command integration tests absent**
   - Despite `runCommand` updates, there is no coverage ensuring slash commands short-circuit the graph
4. **Spool/dispatch have zero automated coverage**
   - Treat Phase 2/3 tests as high priority to prevent regressions

## Definition of Done

- All tests above written following TDD (fail first, pass with implementation, prevent regression)
- `pnpm lint:smart && pnpm typecheck:smart && pnpm test:smart` complete without legacy errors
- No route/tool returns placeholder strings (verified by regression + targeted tests)
- `n0` graph emits telemetry spans/metrics with brAInwav branding
- All docs updated to reflect real implementations; no “mock” or “placeholder” claims remain
- Production guard scripts enforce standards in CI
- Final smoke test demonstrates a full turn through `/agents/execute` invoking real adapters, persisting data, and streaming outputs via AGUI channels

<!-- markdownlint-enable MD013 -->
