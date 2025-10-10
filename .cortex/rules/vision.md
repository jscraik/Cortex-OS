<!-- filename: VISION.cortex-os.md -->

# Cortex-OS Vision Document (v1.0, 2025-10-10)

## 0) North Star (End State)

Cortex-OS is a self-contained, local-first **Agentic Second Brain Runtime (ASBR)** that:

1) orchestrates agents and workflows with **LangGraph**,
2) persists knowledge via a **Memory Core** and **RAG pipeline**,
3) exposes **only** controlled integration surfaces: **MCP**, **A2A**, **REST API**, and **frontier model adapters**, and
4) ships with an **Ops Dashboard** for health, logs, metrics, traces, and manual controls.

## 1) Core Principles

- **Local-first, vendor-neutral** (MLX + Ollama for on-device; cloud/frontier optional).
- **Deterministic & evidence-backed** (reproducible runs, artifacted logs/metrics).
- **Single integration hub** (one MCP server; tools/resources/prompts are registered, not embedded).
- **Tight boundaries** (no side channels beyond MCP/A2A/REST/frontier).
- **Security & A11y by default** (API-key auth, least privilege; WCAG-aware UX).
- **Small, shippable steps** (quality gates; “done means observable + testable”).

## 2) System Boundaries (Allowed Interfaces)

- **MCP (Model Context Protocol)** over **HTTP/SSE** (and optional **STDIO**).
- **A2A** (Agent-to-Agent hub) for intra-runtime agent messaging.
- **REST API** for programmatic control and app integrations.
- **Frontier Model Adapters** (e.g., OpenAI/Anthropic/Google), **ChatGPT Connectors / Apps SDK**, **Perplexity SSE**.

## 3) Architecture Overview

### 3.1 ASBR Orchestrator (LangGraph)

- Owns graph definitions, policies, and run lifecycle.
- Invokes MCP tools/resources, A2A messages, Memory, and RAG.
- Emits structured telemetry (traces, metrics, logs) with run IDs.

### 3.2 MCP (Single Hub)

- **FastMCP v3** server exposing: **/mcp** (protocol), **/sse** (stream), **/health**, **/metrics**.
- Registers **Tools**, **Resources**, **Prompts** from the registry.
- **Auth**: API-key required by default; dev mode may allow no-auth. Behind **Cloudflare Tunnel** for remote access.
- **Note**: Tools are external modules; MCP mediates calls—no duplicate MCPs inside packages.

### 3.3 A2A Hub

- Central bus for agent-to-agent messages (topics, intents, envelopes).
- Policies for routing, retries, backoff, and auditing.

### 3.4 Memory Core

- Single source of truth for memories (facts, episodes, artifacts, embeddings).
- CRUD + search APIs; retention policies; export/import.
- Adapters for vector stores (local first; cloud optional).

### 3.5 RAG Pipeline

- Ingestion → chunking → embedding → indexing → retrieval → post-processing.
- Deterministic pipelines with versioned configs and replayable jobs.

### 3.6 Agents

- Role-scoped, capability-scoped agents (builder/reviewer/guardian/etc.).
- Operate under ASBR policies and quality gates; evidence pointers required.

### 3.7 Connectors & Frontier Surfaces

- **ChatGPT Connectors / Apps SDK** to let ChatGPT operate Cortex-OS within boundaries.
- **Perplexity SSE** supported via streaming adapter.
- Direct frontier APIs via adapters (rate-limited, policy-guarded).

### 3.8 Ops Dashboard (React)

- Health cards, logs viewer, trace explorer, metrics graphs, queue/state monitors.
- Manual controls: pause/resume runs, retry, drain, “run test flow”.
- Authenticated access; A11y (keyboard navigation, no color-only signaling).

### 3.9 Observability & Security

- **Metrics** (Prometheus), **Traces** (OpenTelemetry), **Logs** (structured, Pino-style).
- **Security**: timing-safe API-key validation; CORS/Host checks; secrets via env/vault.
- **403 triage** checklist: endpoint path, Host/CORS, API-key header, Cloudflare policies, dev no-auth flag alignment with client expectations.

## 4) Packages: Vision & “Done Means”
>
> Names are indicative—adapt to your monorepo paths.

### 4.1 `packages/mcp-server`

**Vision:** Minimal FastMCP v3 server exposing HTTP/SSE + health/metrics; loads registry; zero business logic.  
**Done means:** Start/stop cleanly; API-key auth on; Cloudflare Tunnel tested; `/health`, `/mcp`, `/sse`, `/metrics` green; integration tests pass.

### 4.2 `packages/mcp-core`

**Vision:** Protocol utilities, schemas, client/server adapters, error taxonomy.  
**Done means:** Types + validation for Tools/Resources/Prompts; stable client for ASBR; exhaustive unit tests.

### 4.3 `packages/mcp-registry`

**Vision:** Declarative registry of Tools/Resources/Prompts with lazy loading.  
**Done means:** Hot-reload in dev; list/read/register APIs; smoke test that one tool/resource/prompt is discoverable and callable via MCP.

### 4.4 `packages/a2a`

**Vision:** Central A2A hub (no per-package A2A).  
**Done means:** Topics/intents; delivery guarantees (at-least-once); retries/backoff; message audit; tests for fan-out and error paths.

### 4.5 `packages/memory-core`

**Vision:** Unified memory store (facts, episodes, embeddings).  
**Done means:** Deterministic IDs; retention + export; vector index adapters; >90% test coverage on CRUD/search.

### 4.6 `packages/rag`

**Vision:** Deterministic ingestion/index/retrieval pipelines.  
**Done means:** Config-driven jobs; snapshotable outputs; retrieval quality smoke tests; perf budget documented.

### 4.7 `packages/agents`

**Vision:** Role-scoped agents with policy gates; evidence-backed outputs.  
**Done means:** JSON-schema I/O; blocking reviewer modes; trace correlation; fixtures for E2E flows.

### 4.8 `packages/orchestration`

**Vision:** LangGraph graphs for core flows; policy enforcement.  
**Done means:** At least one golden path (ingest→index→query) and one incident path; replayable runs; determinism checks.

### 4.9 `packages/connectors`

**Vision:** Adapters for ChatGPT Connectors/Apps SDK, Perplexity SSE, frontier APIs.  
**Done means:** Sample ChatGPT app config; SSE demo; rate-limit & auth guards; 403 triage doc.

### 4.10 `apps/dashboard`

**Vision:** A11y-first React dashboard for health, logs, traces, metrics, agent controls.  
**Done means:** Keyboard-navigable UI; live metrics; log search; run controls; role-based access.

### 4.11 `apps/cortex-os` (ASBR host)

**Vision:** Boots ASBR, mounts graphs, wires MCP/A2A/Memory/RAG, exposes REST.  
**Done means:** One-command dev up; golden-path E2E test; graceful shutdown; provenance artifacts saved.

## 5) Non-Goals

- Multiple MCP servers per package (duplication).  
- Unbounded interfaces beyond MCP/A2A/REST/frontier adapters.  
- Opaque AI actions without evidence/logs.

## 6) Success Metrics

- **Reliability:** ≥99% success on golden-path E2E; no data-loss on restart.  
- **Quality:** CI gates green; >90% unit coverage key packages; trace spans for 95% of operations.  
- **Security:** All external calls authenticated; zero 403s in happy path; secrets never logged.  
- **UX/A11y:** Full keyboard coverage; no color-only indicators; screen-reader labels present.

## 7) Glossary

- **MCP:** *Model Context Protocol* – tools/resources/prompts registry and invocation protocol.
- **ASBR:** Agentic Second Brain Runtime – Cortex-OS orchestrator built on LangGraph.
- **A2A:** Agent-to-Agent hub for intra-runtime messaging.
