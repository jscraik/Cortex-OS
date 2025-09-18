# Orchestration ⇒ LangGraphJS Refactor Plan

**Objective**: Replace the current PRP-centric orchestration package with a LangGraphJS-driven runtime that coordinates real Voltage agents using MLX-first, Ollama fallback, and optional Frontier APIs. The work must ship in bite-sized, TDD-first commits that keep `main` releasable.

---

## Current Status (live)

- Phase 0: Complete — prerequisites doc, guard test, sanity script, and API snapshot in place.
- Phase 1: In progress — Zod schemas added; model registry loader validates catalogs with tests.
- Phase 2: In progress — Minimal LangGraph factory (`createCerebrumGraph`) created
   with a passing foundation test. Persona loader scaffolded and execution harness
   added; policy guard and model selection nodes introduced with tests.

Next focus: finalize persona/policy middleware behavior and minimal execution harness contract, then document enforcement semantics.

---

## Phase 0 · Baseline + Guardrails (1–2 commits)

1. **Document prerequisites**
   - Tests: add `docs/prereqs.md` skeleton + failing contract test (e.g., verify env vars present) to ensure CI catches missing config.
   - Impl: capture current infra expectations (MLX, Ollama, Frontier endpoints) and add sanity check script.
2. **Stabilize current package**
   - Tests: snapshot current public exports using Vitest to prevent accidental regressions during refactor.
   - Impl: no production code change; commit ensures we have safety net.

---

## Phase 1 · Shared Model Catalog Loader (2–3 commits)

1. **Introduce JSON schema + loader**
   - Tests first: unit tests that fail because `ModelRegistry.load()` is missing.
   - Impl: read `config/mlx-models.json` & `config/ollama-models.json` via `zod`; expose typed models.
2. **Integrate with model providers**
   - Tests first: expect MLX provider to use registry output (fail until wired).
   - Impl: replace static `MODEL_STRATEGY` with runtime lookup; wire health checks.
3. **Cross-package reuse** (optional chunk)
   - Tests: ensure agents + orchestration share same loader contract.
   - Impl: move loader to shared workspace package if needed.

---

## Phase 2 · LangGraph Foundation (3–4 commits)

1. **Add LangGraph runtime shell**
   - Tests: create failing spec verifying `createCerebrumGraph()` builds expected node list.
   - Impl: scaffold graph factory with stub nodes, no execution yet.
2. **Persona + policy guards**
   - Tests: failing tests assert persona rules (WCAG, security) enforced via middleware.
   - Impl: load `.cortex/library/personas/cerebrum.yaml` and attach guard transformers.
3. **Execution harness**
   - Tests: integration test executing trivial graph run returns success.
   - Impl: wrap graph in executor service (incl. shutdown, telemetry).

---

## Phase 3 · Tool & Agent Nodes (4–5 commits)

Iterate tool-by-tool; each commit = one tool node with TDD (test fixture → implementation → docs).

1. **Filesystem view/list/glob node**
2. **Write/Replace + Edit (patch) nodes**
3. **Grep / search node**
4. **Bash & Notebook nodes**
5. **dispatch_agent voltage bridge**
   - Tests: run graph slice that calls Voltage agent mock hitting real loader.

---

## Phase 4 · Model Routing & Streaming (2–3 commits)

1. **Integrate MLX/Ollama streaming**
   - Tests: assert `modelRequest` uses MLX first, falls back to Ollama when health fails.
   - Impl: connect registry outputs to LangGraph tool executors.
2. **Add Frontier optional adapter**
   - Tests: skip / mark pending unless `FRONTIER_API_KEY` available; ensure fallback order correct.
   - Impl: plug into registry availability flags.

---

## Phase 5 · Migration of Public API (2 commits)

1. **Provide LangGraph-backed orchestration facade**
   - Tests: existing `orchestrateTask` spec updated to expect graph execution.
   - Impl: swap internals while keeping signature.
2. **Deprecate legacy PRP paths**
   - Tests: ensure calling removed exports throws guided error.
   - Impl: remove PRP code, update README + type declarations.

---

## Phase 6 · End-to-End Validation (2 commits)

1. **Scenario tests**
   - Tests: multi-step LangGraph workflow using real agents hitting filesystem + memory.
   - Impl: add fixtures & sample workflow docs.
2. **Observability + audit alignment**
   - Tests: verify audit events & OTEL spans emitted.
   - Impl: connect graph transitions to existing logging/telemetry.

---

## Phase 7 · Hardening & Release (1–2 commits)

1. **Performance + resource checks**
   - Tests: add perf budget test (e.g., ensures average step under threshold) or monitoring script.
   - Impl: tune concurrency, health-check intervals.
2. **Docs & Readiness**
   - Update README, `readiness.yml`, and release notes with new architecture & ops steps.

---

### Working Agreements

- **TDD**: For every chunk, write failing tests first, then minimal code, followed by refactor.
- **Commit hygiene**: one logical change per commit; include tests + implementation.
- **Validation cadence**: run `pnpm lint:smart`, `pnpm test:smart`, `pnpm typecheck:smart` before each PR.
- **Infrastructure expectations**: ensure MLX, Ollama, Frontier services are reachable locally; document fallback behavior for CI.

This plan leaves clear, committable steps that keep the repo releasable while migrating to the new orchestration architecture.
