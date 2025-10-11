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
- [🚧] Add React/Jest suites (hooks, widget e2e, a11y, perf) using Apps SDK mocks. *(Hook + dashboard unit tests landed; a11y/perf remains.)*

## Phase 2 — Minimal Implementation (GREEN)
- [✅] Implement manifest loader/signer and expose `/v1/connectors/service-map`.
- [✅] Replace ExecutionSurfaceAgent stubs with manifest-driven registry + caching.
- [✅] Enhance MCP bridge RemoteToolProxy with auth headers + metrics gauge.
- [✅] Bootstrap MCP server connectors proxies using OpenAI Agents SDK metadata.
- [✅] Implement Python connectors server (auth, SSE, Apps bundle serving).
- [✅] Integrate React widget with OpenAI Apps SDK session + manifest polling.

## Phase 3 — Refactor & Hardening
- [ ] Extract shared manifest validation utilities across TS/Python.
- [ ] Ensure functions ≤40 lines, add abort controllers + error branding.
- [ ] Optimize logging/telemetry volume; verify Prometheus gauge naming.
- [ ] Document updated operator guides (`docs/connectors/…`, `docs/operators/…`).

## Phase 4 — Verification & Evidence
- [ ] Run required pnpm/uv tasks (build, lint, typecheck, test, coverage).
- [ ] Capture security + structure scan artifacts in `verification/`.
- [ ] Archive test logs and coverage reports under `test-logs/` and `verification/`.
- [ ] Update `.github/instructions/memories.instructions.md` with decision log.

## Phase 5 — Review & Lessons
- [ ] Summarize review outcomes in `code-review.md` once PR(s) land.
- [ ] Capture lessons learned + monitoring follow-ups.

> Remember to keep `implementation-log.md` updated as work progresses.
