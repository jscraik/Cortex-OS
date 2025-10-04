# docs/prd/cortex-os-agentic-second-brain.prd.md

# Cortex-OS PRD — Agentic Second Brain

> **⚠️ HISTORICAL DOCUMENT**: This PRD references `apps/api`, `cortex-marketplace`, and `cortex-marketplace-api` which have been removed from the codebase. Content preserved for historical reference and product vision context.

Version: 1.1 • Date: 2025-08-30 • Owner: Jamie • Status: Implementation

## 0. Objective

Build a governed, local-first “agentic second brain” that plans, simulates, executes, proves, and teaches. One ASBR-lite runtime (the brain) coordinates agents, tools, and memories with **MLX-first** execution and policy-routed parity to **Ollama** and **frontier APIs**.

## 1. Vision and Mission

**Vision:** Vendor-neutral, deterministic, accessibility-aware second brain for solo devs with team-grade velocity, safety, and auditability.  
**Mission:** Enforce contracts, route capabilities, learn by replay, and attach proofs for every action across CLI, Web, API, IDE, MCP, and A2A.

## 2. Core Principles

- Local-first. MLX fast path. Privacy pin possible.
- Single brain (ASBR) for plan→contract→route→enforce.
- Everything via **MCP** and **A2A**. No cross-feature imports.
- Deterministic contracts, CloudEvents, Problem+JSON, OTEL.
- Teach via replay. Simulate before act. Prove after act.
- A11y: WCAG 2.2 AA and ARIA where applicable.

## 3. Wireframes

### 3.1 Runtime flow

```text
User → CLI / Web / API / IDE
      │
      ▼
CEREBRUM (plan, critique, simulate, teach)
      │ plan→route→execute→prove
      ▼
ASBR-lite Kernel (DI, Contract Registry, Policy Router, A2A, Provenance/OTEL)
      │
      ▼
Agents (single-focus, proofs) ──► Model Gateway (/chat|/embeddings|/rerank)
                                   │
                                   ├─ MLX (host-native, Metal)
                                   ├─ Ollama (host or container)
                                   └─ Frontier APIs (via Cloudflare edge)
      │
      ├─ A2A (outbox/DLQ/idempotency, CloudEvents)
      ├─ Memories (short/long, encrypted, TTL)
      ├─ RAG (ingest, retrieve, rerank, cite)
      └─ Observability (OTEL traces, logs, metrics, ULIDs)

3.2 Dev containerization (OrbStack + host MLX)

Cloudflare Edge (Workers/Queues/Tunnels)
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│ OrbStack (Docker-compatible VM on macOS)                     │
│                                                              │
│  Containers (one per service):                               │
│   • apps/api (REST/Webhooks)                                 │
│   • apps/cortex-web (Next.js UI)                             │
│   • apps/cortex-os (ASBR-lite brain)                         │
│   • packages/model-gateway (/chat|/embed|/rank)              │
│   • packages/mcp-registry (HTTP registry)                    │
│   • agents workers (if long-running)                         │
│   • NATS JetStream, Postgres, Qdrant, Ollama (opt)           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
Host macOS:
  apps/cortex-py (MLX servers) → http://localhost:8081  [Metal]
  Optional Ollama host at :11434

4. Scope — Surfaces and Packages (complete)

4.1 Applications (apps/*)

apps/cortex-os — ASBR-lite brain
 • Vision: One governed runtime.
 • Mission: Wire services, enforce contracts, route, prove.
 • Must: DI, contract registry, policy router, OTEL, provenance, structure-guard.
 • Should: Privacy pin to MLX; cost guardrails; policy hot-reload.
 • Nice: Admin health/routing UI.
 • Use cases: start workflow; route capability; emit lifecycle events.

apps/cortex-cli — Command line
 • Vision: Fast local control.
 • Mission: Invoke workflows, subagents, diagnostics.
 • Must: cortex agents|use|do, --plain A11y.
 • Should: TUI for events/replay.
 • Nice: Scriptable macros.

apps/cortex-web — Web UI
 • Vision: Visual cockpit.
 • Mission: Runs, traces, policies, evidence.
 • Must: Runs list; trace viewer; evidence; A11y.
 • Should: Policy editor; subagent manager.
 • Nice: Sim dashboard.

apps/cortex-marketplace — MCP marketplace UI
 • Vision: Safe tool discovery.
 • Mission: Browse, vet, install MCP servers/templates.
 • Must: Catalog; signature status; scopes.
 • Should: Ratings; provenance.
 • Nice: Sandbox test.

apps/cortex-marketplace-api — Marketplace backend
 • Vision: Curated registry API.
 • Mission: Serve signed manifests and schema-checked listings.
 • Must: List/detail; signature metadata.
 • Should: Abuse controls; quotas.
 • Nice: CVE alerts.

apps/api — Public REST/Webhooks
 • Vision: Stable external API.
 • Mission: Ingress for jobs and webhooks.
 • Must: Auth; rate-limit; Problem+JSON.
 • Should: Async job status.
 • Nice: Signed webhook retries.

apps/cortex-py — MLX servers (host-native)
 • Vision: High-efficiency MLX.
 • Mission: embed/chat/rerank with guards and cache.
 • Must: Thermal/memory guards; KV cache; batch; healthz.
 • Should: paged KV reuse; low-VRAM mode.
 • Nice: speculative decoding.

4.2 Packages (packages/*)

packages/asbr — Cerebrum
 • Vision: Meta-agent layer.
 • Mission: plan(), critique(), simulate(), replay().
 • Must: simulation gates; plan approval.
 • Should: epistemic confidence tags.
 • Nice: curriculum builder.
 • Use cases: planning with proof criteria; replay on correction.

packages/agents — Single-focus agents
 • Vision: Focused executors.
 • Mission: Business flows with proofs.
 • Must: code-analysis; test-gen; docs.
 • Should: golden outputs; streaming.
 • Nice: interactive corrections.

packages/orchestration — Functional workflows
 • Vision: Deterministic pipelines.
 • Mission: seq/parallel/conditional/loop; hooks.
 • Must: pure runners; timeouts; retries.
 • Should: compensation; cancel.
 • Nice: typed DSL.

packages/a2a — Event bus
 • Vision: Reliable pub/sub.
 • Mission: CloudEvents; outbox; DLQ; idempotency; correlation IDs.
 • Must: schema validation; at-least-once.
 • Should: topic ACLs; redaction.
 • Nice: replay helpers.

packages/a2a-services — Bus middleware
 • Vision: Shared controls.
 • Mission: rate limits; quotas; schema registry client.
 • Must: validators; limiter.
 • Should: quotas per agent.
 • Nice: burst smoothing.

packages/memories — Memory stores
 • Vision: Durable evolving memory.
 • Mission: short/long stores with provenance.
 • Must: KV/doc; TTL; encryption; namespaces.
 • Should: consolidation jobs; vectors.
 • Nice: decay heuristics.

packages/rag — Retrieval
 • Vision: Evidence-first retrieval.
 • Mission: ingest; retrieve; rerank; cite.
 • Must: chunkers; retriever iface; rerank via gateway.
 • Should: bundles with citations.
 • Nice: freshness routing.

packages/model-gateway — Vendor-neutral ML API
 • Vision: One endpoint for many models.
 • Mission: /chat|/embeddings|/rerank across MLX/Ollama/Frontier.
 • Must: parity contracts; circuit breakers; sticky sessions.
 • Should: VRAM/token budgets; health/quality scores.
 • Nice: multi-GPU sharding.

packages/mcp — MCP Suite (big)
 • Vision: First-class tool protocol for Cortex-OS.
 • Mission: Clients, types, auth, tracing, policy, error model.
 • Must: stdio|http|sse clients; capability discovery; allowlist; retries/backoff; OTEL spans; Problem+JSON mapping; JSON Schema validation.
 • Should: tool sandbox policies; health pings; streaming chunk control.
 • Nice: per-tool cost/latency meters.
 • Use cases: call external tool; attach evidence; enforce scopes.

packages/mcp-bridge — Transport bridge
 • Vision: Cross-transport glue.
 • Mission: stdio↔HTTP/SSE bridging with flow control.
 • Must: streaming; backpressure.
 • Should: TLS mTLS option.
 • Nice: edge cache.

packages/mcp-registry — Server registry
 • Vision: Source of truth for tools.
 • Mission: registry.yaml + HTTP index with capability search.
 • Must: signature info; schema refs.
 • Should: health cache.
 • Nice: policy hints.

packages/mcp-server — Server scaffolds
 • Vision: Fast MCP server authoring.
 • Mission: TS/Py templates with tests.
 • Must: health; schema guards; examples.
 • Should: codegen from schemas.
 • Nice: adapters.

packages/kernel — Core kernel (MVP)
 • Vision: Minimal primitives.
 • Mission: types; DI tokens; errors; config; clocks.
 • Must: ULID; Problem+JSON; config loader.
 • Should: feature flags.
 • Nice: virtual time.

packages/mvp — MVP utilities
 • Vision: Opinionated foundations.
 • Mission: guards; serializers; helpers.
 • Must: input guards; sanitizer.
 • Should: perf counters.
 • Nice: adapters.

packages/mvp-core — Shared core logic
 • Vision: Cross-feature basics.
 • Mission: DTOs; constants.
 • Must: stable DTOs; SemVer.
 • Should: deprecations file.
 • Nice: codemods.

packages/mvp-server — Minimal server shell
 • Vision: Drop-in HTTP shell.
 • Mission: consistent bootstrap; health/ready.
 • Must: graceful shutdown; metrics.
 • Should: CORS policy.
 • Nice: config UI.

packages/prp-runner — Plan·Reason·Program pipelines
 • Vision: PRP executor.
 • Mission: run PRP graphs with checkpoints.
 • Must: step replay; evidence attach.
 • Should: diffs; partial rollback.
 • Nice: auto-summaries.

packages/registry — Schema registry svc/client
 • Vision: Contract authority.
 • Mission: serve/validate JSON Schemas.
 • Must: AJV validation; versioning.
 • Should: hash pins; provenance.
 • Nice: UI browser.

packages/security — Security kit
 • Vision: Default-deny.
 • Mission: RBAC/ABAC; egress allowlist; secrets.
 • Must: deny-by-default egress; per-tool RBAC.
 • Should: per-subagent scopes.
 • Nice: sandbox profiles.

packages/simlab-mono — Simulation lab
 • Vision: Safety via simulation.
 • Mission: dry-run plans; compare vs actual.
 • Must: what-if runs; metrics.
 • Should: failure injectors.
 • Nice: auto test generation.

packages/observability — Traces/logs/metrics
 • Vision: Explain every run.
 • Mission: OTEL + ULIDs; redaction.
 • Must: span propagation; P50/P95/P99; error budget calc.
 • Should: local viewer.
 • Nice: flamegraphs.

4.3 Contracts (contracts/*)
 • CloudEvents envelopes. AsyncAPI channels. AJV tests.
 • Must: 100% validation in CI.

5. Functional Requirements

FR-1 Cerebrum converts intents to approved workflows; blocks on failed simulation.
FR-2 Router scores providers by capability, privacy, latency, cost, health.
FR-3 Model Gateway exposes /chat|/embeddings|/rerank with MLX→Ollama→Frontier fallback.
FR-4 Agents publish lifecycle CloudEvents with evidence pointers.
FR-5 A2A ensures at-least-once with outbox/DLQ and idempotency keys.
FR-6 Memories store inputs, outputs, proofs, configs, ULIDs.
FR-7 Problem+JSON for all errors.
FR-8 Structure-guard blocks cross-feature imports and disallowed writes.
FR-9 Privacy mode pins to MLX/local only.
FR-10 Cloudflare edge restricts frontier egress and logs usage.
FR-11 MCP suite enforces allowlists and schemas on every tool call.

6. Non-Functional Requirements
 • Latency SLOs: MLX P50 200 ms, P95 500 ms, P99 1 s; Frontier P50 2 s, P95 6 s.
 • Success rate ≥ 99.0% monthly; error budget ≤ 1%.
 • CPU ≤ 75% 1-min avg; GPU VRAM ≤ 85% sustained.
 • Test coverage ≥ 80% statements; contracts 100% validated.
 • A11y: CLI/Web no color-only signals; labels; keyboard help ?.

7. APIs, Schemas, Contracts

7.1 Model Gateway (localhost:8081)

POST /chat       {input, policy, session} -> {output, evidence[], provider}
POST /embeddings {texts[], modelHint?}    -> {vectors[], dims, provider}
POST /rerank     {query, items[]}         -> {scores[], provider}

7.2 Error model (Problem+JSON)

{"type":"about:blank","title":"thermal_throttle","status":503,
 "detail":"Device overheated","instance":"urn:ulid:01J...","extras":{"provider":"mlx"}}

7.3 CloudEvents envelope (A2A)

{"specversion":"1.0","type":"agent.code-analysis.completed","id":"01J...",
 "source":"packages/agents/code-analysis","time":"2025-08-30T18:00:00Z",
 "datacontenttype":"application/json","data":{"result":{},"evidence":[]}}

7.4 Subagent config (Markdown + YAML)

name: code-reviewer
description: Expert review
tools: git.diff, fs.read, grep, shell.run
policies: { privacy: true, target_latency_ms: 800, cost_ceiling_usd: 0.50, evidence_required: true }
routing: { capability: chat-completion, fallbacks: [ollama, frontier] }
context: { window: project, include_paths: ["src/**","tests/**"] }

7.5 MCP call contract (client perspective)

callTool(serverId, toolId, input) -> { ok: true, data } | { ok: false, problem: ProblemJson }
Constraints: toolId allowlisted; input validated by JSON Schema; OTEL span required.

8. Data Models
 • Run: {ulid, workflowId, inputs, outputs, providerTrace, evidence[], timings, budgets}.
 • Memory: {key, ns, payload, ttl, enc, provenance{runId,url,line}}.
 • Event: CloudEvents + schemaRef.
 • Policy: {privacy, latencyTarget, costCeil, capabilityAllowlist}.

9. Security
 • Egress deny-by-default; frontier hosts allowlisted at Cloudflare.
 • Per-tool RBAC; per-subagent scopes; audit log of calls.
 • Secrets scoped; no plaintext in events.
 • Supply chain: SPDX SBOM; OSV-Scanner; CodeQL; gitleaks; cosign.

10. Observability
 • OTEL spans across agent→gateway→provider; ULIDs propagated.
 • Metrics: latency percentiles per capability/provider; error budget burn; saturation.
 • Logs: structured; redacted; link evidence.

11. A11y & UX
 • CLI: --plain, labeled outputs; keyboard help.
 • Web: WCAG 2.2 AA; roles; focus order; no color-only signals.

12. Test Plan (TDD spine)
 • Unit: router scoring; circuit breaker; MCP validators.
 • Contract: CloudEvents; Problem+JSON; Gateway IO.
 • Integration: agent→gateway→{MLX,Ollama,Frontier}; A2A outbox/DLQ.
 • E2E: privacy pin; simulation gate; replay loop.
 • Chaos: thermal throttle; network timeouts; provider crash.
 • Load: embeddings+chat P95/P99; error budget alarms.
 • Structure: import/path guards; MCP allowlist.

13. Rollout Plan

P1 (Wk 1–2): Contracts; ASBR-lite; Router; Model Gateway+MLX; A2A outbox/DLQ; OTEL.
P2 (Wk 3–4): Ollama+Frontier adapters; three agents; privacy pin; Cloudflare edge.
P3 (Wk 5–6): Cerebrum simulate/replay; RAG bundles with citations; dashboards; policy hot-reload.

14. Governance & CI Gates
 • .cortex/ is SoT: rules, policy, schemas, gates.
 • CI must pass: structure-guard; contracts-test; unit; integration; chaos smoke; A11y; supply-chain scans.
 • Conventional Commits; SemVer on schemas and public packages.

15. Containerization Matrix (dev/prod)

Component Containerized Notes
apps/cortex-os Yes Node, non-root, RO FS
apps/api Yes Public REST/Webhooks
apps/cortex-web Yes Next.js standalone
apps/cortex-cli No Host binary; optional thin image
apps/cortex-marketplace Yes Static/SSR
apps/cortex-marketplace-api Yes Backend
apps/cortex-py (MLX) Host-native Metal; http://localhost:8081
packages/model-gateway Yes Dev can use host networking
packages/mcp-registry Yes Small HTTP svc
packages/agents (workers) Yes (if long-running) A2A consumers
NATS/Postgres/Qdrant/Ollama Yes Infra
All other packages Library-only Bundled into images

16. Runbooks

Dev (OrbStack)
 • Start MLX host: uv run python apps/cortex-py/serve.py --port 8081
 • Compose up: docker compose -f docker-compose.dev.yml up --build
 • Web: http://localhost:3000, API: http://localhost:8080, Gateway: http://localhost:8081

Prod (single node)
 • MLX host reachable at localhost:8081.
 • docker compose -f docker-compose.prod.yml up -d
 • Cloudflare Tunnel → web; Workers → api.

K8s
 • Helm deploy. Ingress for web. MLX stays off-cluster on mac or on Linux GPU node if using non-MLX flow.

17. Risks, Traps, Mitigations
 • MCP overhead in tight loops → keep inner loops in-process via Gateway.
 • “99.9%” on single box → scope SLO properly; avoid HA claims.
 • Contract drift → schema registry + CI contract tests.
 • Frontier cost creep → cost ceilings + edge egress policy.
 • Thermal throttling → breaker + backoff + sticky away from MLX.

18. Acceptance Criteria
 • AC-1 Cerebrum blocks on failed simulation with reasons.
 • AC-2 Privacy=true routes 100% to MLX/local; zero frontier egress.
 • AC-3 Agents emit valid CloudEvents; CI fails on schema drift.
 • AC-4 Gateway parity across providers with typed outputs.
 • AC-5 Outbox/DLQ replay succeeds after induced failure.
 • AC-6 OTEL shows end-to-end spans with provider attribution.
 • AC-7 Structure-guard fails PR on cross-feature imports.
 • AC-8 A11y checks pass: CLI plain; Web Axe ≥ 90.

19. Open Questions
 • Provider quality scoring cadence and source.
 • Memory consolidation thresholds.
 • Local trace viewer vs external collector.

20. Recency Rule

Before merging provider adapters or Cloudflare bindings, verify current SDKs, Workers quotas, and container runtime notes. Update SLOs if model runtimes change.

⸻

Appendix A: Subagents live in .cortex/agents/*.md with YAML frontmatter. They inherit tools unless restricted. Policies control privacy, cost ceilings, and target latency. Cerebrum selects automatically or via CLI cortex use <name>.

```

User → CLI / Web / API / IDE
│
▼
┌─────────────────────────┐
│ Cerebrum Layer │
│ • Plan & Critique │
│ • Evaluate Evidence │
│ • Teach & Replay │
│ • Simulation First │
└───────────┬────────────┘
│ plan→route→execute→prove
┌───────────▼────────────┐
│ ASBR-lite Kernel │
│ • DI & Contract Registry│
│ • Policy Router │
│ • A2A Event Bus │
│ • Provenance + OTEL │
└───────────┬────────────┘
▼
┌─────────────────────────┐
│ Agents Layer │
│ • Single-focus agents │
│ • Publish CloudEvents │
│ • Attach proofs │
└───────────┬────────────┘
▼
┌─────────────────────────┐
│ Model Gateway │
│ /chat /embed /rerank │
│ • MLX adapter (fast) │
│ • Ollama adapter │
│ • Frontier adapters │
└───────────┬────────────┘
▼
Providers: MLX ▸ Ollama ▸ Frontier APIs
│
┌──────▼─────────┐
│ Memories/RAG │
│ • Short/long │
│ • Proof store │
└──────┬─────────┘
▼
┌─────────────────────────┐
│ SimLab │
│ • Run “what-if” trials │
│ • Compare vs actual │
└─────────────────────────┘

User → Web/CLI/API
│
▼
Cloudflare Workers/Queues/Tunnels (egress allowlist)
│
▼
┌───────────────────────────────────────────────────────────────┐
│ OrbStack (lightweight Linux VM with shared kernel) │ ← Docker engine inside VM; low overhead, WSL2-like. [oai_citation:0‡docs.orbstack.dev](https://docs.orbstack.dev/architecture)
│ │
│ Host networking: containers ⇄ macOS via localhost │ ← --net host supported on mac; no host.docker.internal needed. [oai_citation:1‡docs.orbstack.dev](https://docs.orbstack.dev/docker/host-networking)
│ VirtioFS: fast bind mounts; prefer volumes for hot I/O │ ← VirtioFS + tuning; volumes faster than bind mounts. [oai_citation:2‡docs.orbstack.dev](https://docs.orbstack.dev/architecture)
│ Rosetta: fast x86 emulation on Apple Silicon │ ← Faster than QEMU for x86. [oai_citation:3‡docs.orbstack.dev](https://docs.orbstack.dev/architecture)
│ │
│ Containers (one service per image) │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│ │ apps/api │ │ apps/cortex- │ │ apps/cortex-web │
│ │ REST/Webhook │ │ os (ASBR-lite)│ │ Next.js UI │
│ └─────┬────────┘ └─────┬─────────┘ └────────┬────────┘
│ │ A2A/HTTP │ A2A/HTTP HTTP
│ ┌─────▼────────┐ ┌─────▼──────────┐ ┌───────▼─────────┐
│ │ agents (wrk) │ │ model-gateway │ │ mcp-registry │
│ │ A2A workers │ │ /chat|embed|rank│ │ HTTP registry │
│ └──────────────┘ └─────┬───────────┘ └─────────────────┘
│ │ HTTP/MCP
│ ┌──────────────┐ ┌─────▼──────────┐ ┌──────────────┐
│ │ NATS JetStr │ │ Postgres │ │ Qdrant (opt) │
│ │ A2A bus │ │ meta/outbox │ │ vectors │
│ └──────────────┘ └───────────────┘ └──────────────┘
└───────────────────────────────────────────────────────────────┘

Host macOS:
apps/cortex-py (MLX) → http(s)://localhost:8081 (Metal)
Optional: Ollama host at :11434
Frontier APIs → via Cloudflare edge allowlist
