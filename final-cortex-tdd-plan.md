# Final Cortex TDD Plan

**Objective**: Eliminate every placeholder, mock, and TODO listed in the blockers audit and prove production readiness with automated tests that prevent regressions.

**Methodology**: Strict Test-Driven Development using Vitest/Jest-style suites (TypeScript) and Supertest for HTTP APIs, with supporting integration checks (Prisma, Playwright, MCP harnesses). Each issue below maps to:

1. **Failing test(s) to add first** – named with exact file locations.
2. **Implementation pairing** – real code that will satisfy the new tests.
3. **Validation hooks** – regression guards (linting/scripts) to stop new placeholders from landing.

---

## 0. Global Guardrails (Stop the TODO/Mock churn)

**Global Guardrails**

- **Detect residual placeholders/mocks before PR merge**
    - *Tests to create first*: `tests/regression/placeholders.spec.ts` scanning repo for forbidden tokens (`TODO:`, `Mock`, `not yet implemented`) while allowing allowlist for docs
    - *Implementation pairing*: N/A – uses existing file loader utilities
    - *Ongoing guard*: Add `pnpm test placeholders` to CI gate + Git hook in `package.json`

- **Ensure every public endpoint has non-mock contract coverage**
    - *Tests to create first*: `tests/contracts/openapi-sync.spec.ts` validates generated OpenAPI spec vs. route handlers (no handler returns stub payload)
    - *Implementation pairing*: Generate OpenAPI from zod schemas; enforce real handler exports
    - *Ongoing guard*: Integrate into `pnpm test:contracts`

- **Prevent new stubs in MCP tools**
    - *Tests to create first*: `packages/mcp-core/tests/tools-contract.spec.ts` checks each tool’s executor references a concrete adapter class, not `'mock'` strings
    - *Implementation pairing*: Implement detection in `packages/mcp-core/src/registry.ts`
    - *Ongoing guard*: Add to `pnpm test:mcp`
---

## 1. API Server & Auth Hardening (Issues 1–3)

### Tests to author first
1. `apps/api/tests/routing/apiRoutes.spec.ts`
   - Assert `/api/v1/tasks`, `/api/v1/agents`, `/api/v1/metrics` respond `200` and include schema-validated payloads.
2. `apps/api/tests/auth/persistence.spec.ts`
   - Use `better-auth` test harness with Dockerized Postgres (via TestContainers) to verify user/session data persists across process restart.
3. `apps/api/tests/auth/features.spec.ts`
   - Validate profile update, session revoke, 2FA enrollment, and passkey registration hit real database tables and return audit entries.

### Implementation pairing
- Replace in-memory adapter with Prisma Postgres adapter (`packages/auth-prisma`).
- Implement REST modules under `apps/api/src/routes/api/v1/*.ts` with Zod schemas + service layer.
- Wire Better Auth plugins (2FA, passkeys) backed by DB tables.

### Validation hooks
- Migration test: `pnpm prisma:migrate:dev --preview-feature --name auth-hardening` executed in CI.
- Supertest contract snapshot stored in `__snapshots__` to catch regressions.

---

## 2. Master Agent Execution & Health (Issues 4–8)

### Tests to author first
1. `services/orchestration/tests/master-agent.exec.spec.ts`
   - Mocks MLX/Ollama adapters via dependency injection, expects actual adapter invocation (spy). Rejects `'Mock adapter response - adapters not yet implemented'`.
2. `services/orchestration/tests/langgraph.integration.spec.ts`
   - Spin up LangGraph test harness; call `/agents/execute` and assert workflow result object contains executed node log.
3. `services/orchestration/tests/health/pool-health.spec.ts`
   - Seed pool with dynamic counts, expect API to return real numbers (no static `5/10/8`).
4. `services/agents/tests/monitor/health-monitor.spec.ts`
   - Unit test ensures monitor checks DB, queue, LangGraph; fails if checks array empty.

### Implementation pairing
- Implement MLX/Ollama adapter bridging in `services/orchestration/src/adapters` with runtime availability checks.
- Replace `/agents/execute` stub with actual LangGraph orchestrator invocation.
- Hook health monitor into real dependencies (database ping, queue depth).
- Replace static metrics with queue introspection via instrumentation.

### Validation hooks
- Add scenario run to `pnpm test:agents` executing orchestrated plan fixture.
- Observability integration test verifying metrics exported to Prometheus.

---

## 3. Memories Service Reliability (Issues 9–10)

### Tests to author first
1. `services/memories/tests/health/database-health.spec.ts`
   - Parametrized over SQLite, Prisma, Local Memory; asserts failure when connection string invalid.
2. `services/memories/tests/stats/backend-metadata.spec.ts`
   - Ensures `/memories/stats` reports actual backend identifier (`sqlite`, `prisma`, `local-memory`).

### Implementation pairing
- Implement adapter-specific health checks calling real connection/ping.
- Detect active storage adapter at runtime and populate metadata structure before response.

### Validation hooks
- Add e2e test to `tests/e2e/memories.health.spec.ts` that spins service with each backend using Docker Compose matrix.

---

## 4. A2A Pipeline Integrity (Issues 11–13)

### Tests to author first
1. `packages/a2a/tests/validation/sanitization.spec.ts`
   - Provide malicious envelope payload; expect sanitization removes scripts without mutating safe fields.
2. `packages/a2a/tests/streaming/mcp-subscription.spec.ts`
   - Establish MCP SSE/WebSocket mock server and assert client receives event stream updates.
3. `packages/a2a/tests/outbox/sync-tool.spec.ts`
   - Inject real `OutboxService` implementation; verify metrics reflect processed events.

### Implementation pairing
- Implement a sanitization process that recursively removes unsafe content (e.g., scripts, HTML tags) from all fields in the `A2AEventEnvelope` object, ensuring safe fields remain unchanged.
- Create a streaming transport layer that receives events from MCP subscriptions and forwards them to clients using Server-Sent Events (SSE) or WebSockets, utilizing Node.js stream APIs for efficient data flow.
- Connect the default `OutboxService` to a message broker (such as Redis or a SQLite-backed queue) for event delivery, and add instrumentation to collect and report metrics on processed events.

### Validation hooks
- Add contract tests ensuring sanitized payloads persist; include `pnpm test:a2a` in CI gating.

---

## 5. Evidence Enhancement & MCP Bridge (Issues 14–15)

### Tests to author first
1. `packages/evidence-runner/tests/enhancement.spec.ts`
   - Feed sample evidence and ensure `enhanceEvidence` returns enriched text + improvement summary; fail if identical to input.
2. `packages/mcp-bridge/tests/browser-executor.spec.ts`
   - Use Playwright in headless mode to confirm browser executor performs navigation + DOM extraction.
3. `packages/mcp-bridge/tests/database-executor.spec.ts`
   - Run SQLite/Postgres queries via the executor; expect real results and error propagation on invalid SQL.
4. `packages/mcp-bridge/tests/tool-mapping.spec.ts`
   - Validate unknown system types gracefully fallback to documented handler instead of throwing.

### Implementation pairing
- Implement `ASBRAIIntegration.enhanceEvidence` using local LLM (MLX) or remote fallback with deterministic options.
- Integrate Playwright/Puppeteer for browser automation with sanitized output.
- Wire database executor to driver/ORM with parameterized queries.
- Expand `toolMappings` and fallback handler; include metrics/logging.

### Validation hooks
- Add nightly Playwright smoke via `pnpm test:mcp:smoke` (skipped in CI w/ `@slow` tag unless `PLAYWRIGHT=1`).
- Attach coverage thresholds for evidence runner package (`vitest --coverage`).

---

## 6. Cross-Cutting Acceptance Suite

1. **End-to-end Scenario** – `tests/e2e/full-stack/orchestrated-run.spec.ts`
   - Boot API, orchestration, memories, A2A, MCP bridge; execute sample user flow (auth → task creation → agent execution → evidence enhancement → MCP tool). Assert no placeholder strings in responses.
2. **Observability Regression** – `tests/e2e/observability.metrics.spec.ts`
   - Verify Prometheus endpoints expose live gauges/counters derived from real systems.
3. **Security Regression** – `tests/security/todo-banned.spec.ts`
   - Static analysis ensuring no `TODO` or `FIXME` comments ship in runtime code paths (allow tests/docs via glob allowlist).

Add these suites to `pnpm test:full` pipeline and require green before release.

---

## 7. Execution Order & Milestones

| Week | Focus | Key Deliverables |
|------|-------|------------------|
| 1 | Global guardrails + API/Auth tests | Placeholder detector, API contract tests failing, Postgres test harness wired |
| 2 | Implement API/Auth fixes | DB-backed auth, profile/session/2FA tests passing |
| 3 | Orchestration + health | Master agent + LangGraph tests green, health monitor real data |
| 4 | Memories reliability | Health & stats tests pass with multi-backend matrix |
| 5 | A2A streaming/outbox | Sanitization + streaming tests green |
| 6 | Evidence + MCP bridge | Playwright/database executor tests passing |
| 7 | Cross-cutting e2e + cleanup | Full-stack scenario green, coverage & lint gates locked |

---

## 8. Definition of Done Checklist

- [ ] All suites above implemented with failing-first commits recorded.
- [ ] CI pipeline updated to include placeholder regression guard.
- [ ] No route/tool returns placeholder text (validated by tests + manual grep).
- [ ] Documentation updated to reflect real integrations (auth, MCP, evidence).
- [ ] Operational runbook includes verification commands for health, streaming, MCP tools.
- [ ] Final smoke test demonstrates production-ready deployment with persisted data and real adapter executions.

