# Implementation Checklist: Manifest-Driven Connectors Runtime

> Source of truth: Follow alongside `implementation-plan.md` and `tdd-plan.md`. Update statuses in-line (use ✅ for complete, 🚧 for in progress, ⏱️ for blocked).

## Phase 0 — Scaffolding

- [ ] Create `config/connectors.manifest.json` seed file and JSON schema generation script.
- [ ] Scaffold `packages/connectors` Python package (pyproject, src layout, tests package).
- [ ] Generate Zod manifest schema + JSON schema artifact under `schemas/`.
- [ ] Add Nx/Just recipes and convenience script `scripts/connectors/run-connectors-server.sh`.
- [ ] Create `apps/chatgpt-dashboard` React/Webpack project wired to OpenAI Apps SDK.

## Phase 1 — Tests First (RED)

- [✅] Author ASBR service map unit + HTTP tests (manifest load, signatures, errors).
- [ ] Add agents connectors registry tests (hydration, disabled connectors, telemetry).
- [ ] Extend MCP bridge/server test suites for auth headers, metrics, availability callbacks.
- [✅] Write Python pytest suites (registry, service map export parity, server e2e).
- [✅] Add React/Jest suites (hooks, widget e2e, a11y, perf) using Apps SDK mocks. *(Hook/unit coverage extended with accessibility + refresh-performance suites on 2025-10-11.)*

## Phase 2 — Minimal Implementation (GREEN)

- [✅] Implement manifest loader/signer and expose `/v1/connectors/service-map`.
- [✅] Replace ExecutionSurfaceAgent stubs with manifest-driven registry + caching.
- [✅] Enhance MCP bridge RemoteToolProxy with auth headers + metrics gauge.
- [✅] Bootstrap MCP server connectors proxies using OpenAI Agents SDK metadata.
- [✅] Implement Python connectors server (auth, SSE, Apps bundle serving).
- [✅] Integrate React widget with OpenAI Apps SDK session + manifest polling.

## Phase 3 — Refactor & Hardening

- [✅] Extract shared manifest validation utilities across TS/Python.
- [✅] Ensure functions ≤40 lines, add abort controllers + error branding.
- [✅] Optimize logging/telemetry volume; verify Prometheus gauge naming.
- [✅] Document updated operator guides (`docs/connectors/…`, `docs/operators/…`).
- [✅] Ship ChatGPT Apps preview harness (Playwright) that boots ASBR + connectors servers and exercises the widget end-to-end. *(Added 2025-10-11; artifacts in `test-logs/apps-preview/`.)*

## Phase 4 — Verification & Evidence

- [ ] Run required pnpm/uv tasks (build, lint, typecheck, test, coverage).
- [ ] Capture security + structure scan artifacts in `verification/`.
- [ ] Archive test logs and coverage reports under `test-logs/` and `verification/`.
- [ ] Update `.github/instructions/memories.instructions.md` with decision log.

## Phase 4.5 — Instructor & Framework Integration (NEW)

### Python Instructor Integration

- [ ] Install `instructor>=1.0.0` and `pydantic>=2.0.0` via `uv add`
- [ ] Create Pydantic schemas: `ConnectorSchema`, `WorkflowSchema`, `AgentSchema`, `MetricsSchema`
- [ ] Implement `instructor_client.py` with retry logic + OpenTelemetry tracing
- [ ] Wrap MCP tools (`get_connectors`, `get_workflows`, `get_agents`, `get_metrics`) with Instructor
- [ ] Add health check for Instructor initialization
- [ ] Configure Prometheus metrics for validation (success/failure, latency)
- [ ] Write unit tests: valid/invalid schemas, retry logic, brAInwav branding in errors
- [ ] Write integration tests: MCP tool responses match Apps SDK `outputSchema`
- [ ] Benchmark validation overhead (target: <50ms p95)

### TypeScript Instructor Integration

- [ ] Install `instructor-js`, `zod@3`, `@openai/apps-sdk` via `pnpm add`
- [ ] Create Zod schemas mirroring Python Pydantic models
- [ ] Implement `instructorClient.ts` with matching retry configuration
- [ ] Create `useInstructorValidation` hook for `setWidgetState` validation
- [ ] Update `Dashboard.tsx` to validate `toolOutput` and widget state using Apps SDK types
- [ ] Write unit tests: schema validation, hook behavior, error handling
- [ ] Measure bundle size impact (target: <30 KiB gzipped)

### Apps SDK Compliance Validation

- [ ] Test all tools in ChatGPT developer mode with Instructor enabled
- [ ] Verify `structuredContent` matches declared `outputSchema` (zero mismatches)
- [ ] Self-host Font Awesome and Google Fonts (fix CSP violations)
- [ ] Configure `openai/widgetCSP` in MCP resource registration
- [ ] Draft privacy policy at `https://cortex-os.brainwav.dev/privacy`
- [ ] Deploy MCP server to production HTTPS endpoint (Fly.io/Render)
- [ ] Capture Apps SDK sandbox screenshots and session URL
- [ ] Complete `verification/apps-sdk-validation-report.md`

### Framework Alignment Documentation

- [ ] Document OpenAI Agents SDK alignment in `packages/orchestration/docs/AGENTS_SDK_ALIGNMENT.md`
- [ ] Archive ADR-001 (Instructor validation), ADR-002 (Agents SDK deferral), ADR-003 (widget state validation)
- [ ] Update `openai-apps-sdk-compliance.md` with Instructor integration evidence
- [ ] Collect performance benchmarks in `verification/instructor-integration-evidence.md`

## Phase 5 — Review & Lessons

- [ ] Summarize review outcomes in `code-review.md` once PR(s) land.
- [ ] Capture lessons learned + monitoring follow-ups.

> Remember to keep `implementation-log.md` updated as work progresses.
