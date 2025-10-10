# Cortex-OS CI Review Checklists (v1.0)

> Use this in PRs and release gates. Check off per-package + global gates. Capture evidence (links, logs, trace IDs).

## 0) Global Quality Gates (G0–G7)

- **G0 Security**
  - [ ] API-key auth enabled by default on external surfaces (MCP HTTP/SSE, REST).
  - [ ] Secrets not logged; .env handling verified; CORS/Host allowlists set.
  - [ ] Cloudflare Tunnel policies reviewed; 403s only on invalid/unauthorized requests.
- **G1 Build & Types**
  - [ ] `pnpm -w build` green; type-check passes across workspaces.
- **G2 Tests**
  - [ ] Unit ≥90% key pkgs; changed-lines ≥95%; E2E golden path runs green.
- **G3 Observability**
  - [ ] `/metrics` exports key counters; OTEL traces linked to run IDs; logs are structured (level, ts, runId).
- **G4 Interfaces**
  - [ ] Only MCP/A2A/REST/frontier adapters exposed; no undocumented ports.
- **G5 E2E Golden Path**
  - [ ] Ingest→Index→Query (RAG) succeeds and is reproducible (deterministic config hash).
- **G6 Accessibility (A11y)**
  - [ ] Dashboard keyboard-navigable; no color-only signaling; labels/roles present.
- **G7 Docs & Ops**
  - [ ] READMEs current; 403 playbook linked; runbooks for start/stop/retry/drain present.

## 1) Package Checklists

### 1.1 `packages/mcp-server`
**Definition of Done**
- [ ] FastMCP v3 HTTP/SSE operational: `/mcp`, `/sse`, `/health`, `/metrics`.
- [ ] API-key auth enforced (dev mode may allow `NO_AUTH=true`).
- [ ] Loads `mcp-registry` on boot; tools/resources/prompts are discoverable.
- [ ] Cloudflare Tunnel egress tested; external probe can reach `/health`.
**Tests**
- [ ] Integration: list tools via MCP client; invoke a sample tool; stream via SSE.
- [ ] Security: invalid/missing key → 401/403; valid → 200.
**Evidence**
- [ ] Curl outputs, logs with runId, trace export screenshot/ID.

### 1.2 `packages/mcp-core`
**Definition of Done**
- [ ] Schemas for Tool/Resource/Prompt + error taxonomy.
- [ ] Typed client for ASBR ↔ MCP with retries/backoff.
**Tests**
- [ ] Schema validation, error mapping, retry logic.

### 1.3 `packages/mcp-registry`
**Definition of Done**
- [ ] Declarative registry; lazy loading; hot-reload in dev.
- [ ] `list/register/read` APIs stable.
**Tests**
- [ ] Discovery + invocation of one tool, one resource, one prompt.

### 1.4 `packages/a2a`
**Definition of Done**
- [ ] Centralized bus; topics/intents; at-least-once delivery; dead-letter queue.
**Tests**
- [ ] Fan-out to N agents; retry/backoff; poison message handling.

### 1.5 `packages/memory-core`
**Definition of Done**
- [ ] CRUD/search; retention; export/import; vector adapters (local first).
**Tests**
- [ ] Deterministic IDs; search recall smoke; retention policy unit tests.

### 1.6 `packages/rag`
**Definition of Done**
- [ ] Config-driven pipelines; snapshotable outputs; retrieval post-processing.
**Tests**
- [ ] Ingest/index/query golden path; perf budget documented.

### 1.7 `packages/agents`
**Definition of Done**
- [ ] Role-scoped agents; JSON-schema I/O; reviewer/guardian modes block on failures.
**Tests**
- [ ] Evidence pointers (file+lines/URL) required; policy gates honored.

### 1.8 `packages/orchestration`
**Definition of Done**
- [ ] LangGraph graphs for golden path + incident path; replayable runs.
**Tests**
- [ ] Determinism guard (same inputs → same outputs); cancellation & resume.

### 1.9 `packages/connectors`
**Definition of Done**
- [ ] Adapters for ChatGPT Apps/Connectors and Perplexity SSE.
- [ ] Sample app config; rate-limit + auth guards; 403 triage doc linked.
**Tests**
- [ ] ChatGPT app calls MCP tool; Perplexity SSE roundtrip.

### 1.10 `apps/dashboard`
**Definition of Done**
- [ ] Health cards; logs viewer; traces; metrics; run controls.
- [ ] A11y: keyboard map, roles, no color-only states.
**Tests**
- [ ] Axe checks pass; keyboard-only walkthrough; error states visible.

### 1.11 `apps/cortex-os` (ASBR host)
**Definition of Done**
- [ ] Boots ASBR; wires MCP/A2A/Memory/RAG; exposes REST control plane.
- [ ] One-command dev up; graceful shutdown; provenance artifacts saved.
**Tests**
- [ ] Golden path E2E and incident path E2E.
