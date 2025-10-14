---
trigger: always_on
alwaysApply: true
---
<!-- filename: /.cortex/rules/vision.md -->

# Cortex-OS Vision Document (v1.1, 2025-10-12)

## 0) North Star (End State)

Cortex-OS is a self-contained, local-first **Agentic Second Brain Runtime (ASBR)** that:

1) orchestrates agent workflows with **LangGraph** under strict phase gates,  
2) persists knowledge via a **Memory Core** with MCP/REST **parity**,  
3) exposes **only** controlled surfaces — **MCP**, **A2A**, **REST**, and **frontier adapters** — guarded by policy, and  
4) ships an **A11y-first Ops Dashboard** for health, logs, metrics, traces, and manual controls.

> **Governance is code.** The runtime acknowledges the nearest `AGENTS.md`, emits evidence tokens, runs a Vibe Check before acting, and treats **time freshness** as a first-class constraint.

---

## 1) Core Principles

- **Local-first, vendor-neutral.** MLX + Ollama preferred; frontier APIs optional behind policy.
- **Deterministic & evidence-backed.** Reproducible runs; artifacted logs, traces, SBOM/provenance.
- **Single integration hub.** Exactly one MCP server; Tools/Resources/Prompts are **registered** (not embedded).
- **Tight domain boundaries.** No cross-domain imports; communicate via A2A topics or declared contracts/schemas.
- **Security, A11y, Observability by default.** API-key/OAuth, WCAG 2.2 AA, structured logs + OTel; secrets retrieved on-demand via the 1Password CLI (`op`) with no long-lived copies.
- **Small, shippable steps.** Quality gates: coverage/mutation, a11y, security, structure guard.
- **Time Freshness Guard.** All dates anchored to harness "today"; ISO-8601 surfaced to users.
- **Hybrid Model — Live Only.** Embeddings/rerankers/generation must hit **live** MLX/Ollama/frontier engines (no stubs/recordings/dry-runs).
- **AGENTS.md + Vibe Check.** Load nearest `AGENTS.md` (persist SHA); call `vibe_check` before file writes/network calls/long runs.

---

## 2) System Boundaries (Allowed Interfaces)

- **MCP (Model Context Protocol)** over **HTTP/SSE** (optional **STDIO**)  
  Paths: `/mcp`, `/sse`, `/health`, `/metrics`
- **A2A** (Agent-to-Agent hub) for intra-runtime messaging (topics, intents, envelopes)
- **REST API** for programmatic control & integrations
- **Frontier Adapters**: OpenAI/Anthropic/Google, ChatGPT Connectors/Apps SDK, Perplexity SSE — all policy-guarded

> **Default ports (must match `.well-known/mcp.json`)**: `3024` MCP, `3026` Local Memory MCP, `3028` Memory API, `39300` Pieces OS.

**Auth modes**
- **API key** by default (dev may allow `NO_AUTH=true`).  
- **OAuth2 (Auth0)** optional; scopes must include: `search.read docs.write memory.read memory.write memory.delete` (RBAC + "Add Permissions in Access Token").

---

## 3) Architecture Overview

### 3.1 ASBR Orchestrator (LangGraph)
- Owns graphs, policies, **phase machine (R→G→F→REVIEW)**, and run lifecycle.
- Invokes MCP Tools/Resources/Prompts, A2A messages, Memory, RAG jobs.
- Emits structured telemetry (traces/metrics/logs) with `brand:"brAInwav"`, run IDs, and phase transitions.

### 3.2 MCP (Single Hub)
- **FastMCP v3** server exposing `/mcp`, `/sse`, `/health`, `/metrics`.
- Loads registries for Tools/Resources/Prompts; no business logic in the server.
- **Auth**: API-key or OAuth2; remote access via **Cloudflare Tunnel**.

### 3.3 A2A Hub
- Central bus for topics/intents; policies for routing, retries/backoff, auditing.
- **No direct cross-domain imports**; use envelopes/contracts only.

### 3.4 Memory Core
- Single source of truth for memories (facts, episodes, embeddings, artifacts).
- CRUD + search APIs; retention/expiry; export/import.
- **Parity rule**: every write available via **MCP & REST**. Evidence persisted to `.github/instructions/memories.instructions.md`.

### 3.5 RAG Pipeline
- Ingestion → chunking → **live** embedding → indexing → retrieval → post-processing (rerankers are **live** only).
- Deterministic pipelines with versioned configs, replayable jobs, and batch evaluation hooks.

### 3.6 Agents
- Role-scoped (builder/reviewer/guardian) with explicit contracts and **evidence pointers**.
- Obey **phase machine** and **HITL at REVIEW only**; blocked otherwise.

### 3.7 Connectors & Frontier Surfaces
- **ChatGPT Connectors / Apps SDK** for bounded operation of Cortex-OS inside ChatGPT (OAuth protected-resource discovery, dynamic client registration).
- **Perplexity SSE** via streaming adapter.
- Rate-limits, audit, and error taxonomy standardized.

### 3.8 Ops Dashboard (React)
- Health, logs viewer, trace explorer, metrics, queue/state monitors.
- Manual controls: pause/resume, retry, drain, "run test flow".
- **A11y**: keyboard navigation, semantic roles, no color-only signaling.

### 3.9 Observability & Security
- **Metrics** (Prometheus), **Traces** (OpenTelemetry), **Logs** (structured/Pino-style).
- Security: timing-safe API-key checks, Host/CORS validation, secret vaults.
- **403 triage**: path, host/CORS, auth header, tunnel policy, dev no-auth alignment.

---

## 4) Packages: Vision & "Done Means"

> Names indicative — adapt to monorepo layout.

### 4.1 `packages/mcp-server`
**Vision:** Minimal FastMCP v3 HTTP/SSE hub; loads registries; zero business logic.  
**Done means:** `/health`, `/mcp`, `/sse`, `/metrics` green; API-key on; Cloudflare Tunnel tested; integration tests pass; **evidence tokens present** (`AGENTS_MD_SHA`, `brAInwav-vibe-check`).

### 4.2 `packages/mcp-core`
**Vision:** Protocol utilities, schemas, adapters, error taxonomy.  
**Done means:** Zod types for Tools/Resources/Prompts; stable client; exhaustive unit tests; import-boundary guards.

### 4.3 `packages/mcp-registry`
**Vision:** Declarative registry with lazy loading.  
**Done means:** Hot-reload in dev; list/read/register APIs; smoke test of discoverable & callable Tool/Resource/Prompt via MCP.

### 4.4 `packages/a2a`
**Vision:** Central A2A hub (no per-package A2A).  
**Done means:** Topics/intents; at-least-once delivery; retries/backoff; message audit; fan-out/error-path tests.

### 4.5 `packages/memory-core`
**Vision:** Unified memory store (facts/episodes/embeddings/artifacts).  
**Done means:** Deterministic IDs; retention/export; vector adapters; >90% test coverage; **parity tests** (MCP & REST).

### 4.6 `packages/rag`
**Vision:** Deterministic ingestion/index/retrieval with **live** models.  
**Done means:** Config-driven jobs; snapshotable outputs; retrieval quality smoke; perf budget; **models:health/smoke logs** attached (model IDs, dims/norms, latency).

### 4.7 `packages/agents`
**Vision:** Role-scoped agents with policy gates; evidence-backed outputs.  
**Done means:** JSON-schema I/O; blocking reviewer modes; trace correlation; E2E fixtures; **phase tokens** emitted.

### 4.8 `packages/orchestration`
**Vision:** LangGraph graphs + policy enforcement (phase, HITL gates).  
**Done means:** Golden path (ingest→index→query) and incident path; replayable runs; determinism checks; **HITL blocked pre-REVIEW**.

### 4.9 `packages/connectors`
**Vision:** Adapters for ChatGPT Apps SDK, Perplexity SSE, frontier APIs.  
**Done means:** Sample ChatGPT config; SSE demo; rate-limit & auth guards; 403 playbook; protected-resource metadata publishing OAuth scopes.

### 4.10 `apps/chatgpt-dashboard`
**Vision:** ChatGPT "glass" dashboard (React) rendered via the OpenAI **Apps SDK**, to monitor health, logs, traces, metrics, and control agents **from within ChatGPT**, under the same governance and auth as the MCP hub.  
**Done means:** Keyboard-navigable UI; live metrics; log search; run controls; role-based access; axe/jest-axe reports; protected-resource discovery (`/.well-known/oauth-protected-resource`) wired; OAuth scopes published (`search.read docs.write memory.read memory.write memory.delete`); app manifest validated in ChatGPT; Cloudflare tunnel tested; structured logs include `brand:"brAInwav"`.

### 4.11 `apps/cortex-os` (ASBR host)
**Vision:** Boots ASBR, mounts graphs, wires MCP/A2A/Memory/RAG, exposes REST.  
**Done means:** One-command dev up; golden-path E2E; graceful shutdown; provenance artifacts saved; **structure guard** clean.

---

## 5) Non-Goals

- Multiple MCP servers per package (duplication)  
- Interfaces beyond MCP/A2A/REST/frontier adapters  
- Opaque AI actions without evidence/logs

---

## 6) Success Metrics

- **Reliability:** ≥99% success on golden-path E2E; zero data-loss on restart.  
- **Quality:** CI gates all green; ≥90% unit coverage key packages; 95% span coverage in traces.  
- **Security:** All external calls authenticated; happy-path free of 403s; no secrets logged.  
- **A11y/UX:** Full keyboard coverage; no color-only indicators; screen-reader labels pass axe/jest-axe.  
- **Governance Evidence:** PRs contain:
  - `AGENTS_MD_SHA:<sha>`, `brAInwav-vibe-check`, `PHASE_TRANSITION:*`  
  - `MODELS:LIVE:OK engine=<mlx|ollama|frontier>` with model IDs and dims/norms  
  - Top-level Code Review Checklist link to `/.cortex/rules/code-review-checklist.md`

---

## 7) Phase Machine & HITL Gating (Runtime Policy)

- **R (Red):** Write failing tests; plan minimal pass → auto-advance to **G** when failing → passing committed.  
- **G (Green):** Implement to pass; coverage gates → **F** when 90/95% thresholds met.  
- **F (Finished):** Refactor/docs/a11y/security/structure-guard + **live model** evidence → **REVIEW**.  
- **REVIEW:** HITL permitted; Code Review Checklist must PASS all BLOCKERs.

> Any `human_input` before REVIEW is a policy violation.

---

## 8) Evidence Protocol (Emitted & Verified)

- **AGENTS Acknowledgement:** `AGENTS_MD_SHA:<sha>` persisted in `.cortex/run.yaml` and first vibe-check log.
- **Vibe Check:** `"brAInwav-vibe-check"` log required before act phases.
- **Live-Only Models:** `pnpm models:health && pnpm models:smoke` output includes engine, model IDs, vector dims/norms, latency, and `MODELS:LIVE:OK`.
- **Time Freshness:** All surfaced dates are ISO-8601; relative terms normalized.

---

## 9) Glossary

- **MCP:** Model Context Protocol — registry/invocation of Tools/Resources/Prompts.  
- **ASBR:** Agentic Second Brain Runtime — Cortex-OS orchestrator on LangGraph.  
- **A2A:** Agent-to-Agent messaging hub.  
- **Phase Machine:** R→G→F→REVIEW gatekeeper of autonomy and HITL.