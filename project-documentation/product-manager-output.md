# Cortex-OS MVP Readiness Review and Verdict

```yaml
---
mode: agent
---
name: product-manager
version: 4.0
category: product
```

## Executive Summary

- Elevator Pitch: Cortex-OS is a modular, governed AI runtime that lets teams orchestrate specialized agents via secure contracts, with MLX-first local models and safe fallbacks.
- Problem Statement: Teams struggle to safely wire LLMs, tools, and workflows across domains; ad-hoc integrations cause security risks, flaky reliability, and slow iteration.
- Target Audience: Platform teams building internal AI systems, security-conscious enterprises, OSS contributors needing reproducible agent orchestration.
- USP: Strict domain boundaries (A2A + contracts), security-first tool governance (policies, audits), and MLX-first model gateway with audited fallbacks.
- Success Metrics: (a) p95 model call < 800ms for embeddings, < 500ms rerank, < 2s chat on MLX; (b) CI security + test gates pass on main; (c) 3 reference scenarios green in Simlab (RAG, code-review, approvals).

## Verdict (100% truthful)

- Current status: Pre-MVP, feature-complete core with gaps to close for “MVP ready.”
- What works now:
  - ASBR runtime architecture and contracts documented and aligned with repo layout.
  - Model Gateway package implemented with MLX-first routing and Ollama fallback; endpoints for embeddings/rerank/chat; audit + policy hooks wired.
  - MCP consolidation completed; security framework and audits in place with an 8.2/10 MCP security score; transport parity planned and mostly implemented.
  - Governance policies, OWASP-oriented scans, Renovate, SBOM direction, and CI patterns documented. A PM2-based concurrency cap design exists for MLX workers.
- Material gaps before MVP:
  1. End-to-end tests exercising Model Gateway + RAG + agents via A2A, including traces/audits.
  2. SSE transport completion and parity validation across MCP clients; rate limiting and improved log redaction.
  3. CI “green” baseline: lint/type/test across workspace; fix or quarantine flaky durability/bridge tests noted in docs.
  4. Production compose with health checks for NATS, Qdrant/FAISS, Model Gateway 8081, and OTEL exporter; smoke tests.
  5. Approvals UI a11y smoke tests and HITL flow validation; WCAG 2.2 AA checks automated.

Conclusion: With 1–2 focused sprints, the system can reach MVP readiness by closing the listed gaps; core architecture is sound and implemented.

## Feature Specifications (key MVP features)

1. Feature: Model Gateway (MLX-first, audited fallbacks)

- User Story: As a platform engineer, I want a single HTTP API for embeddings, rerank, and chat, so that agents can use local MLX models with safe fallbacks and consistent auditing.
- Acceptance Criteria:
  - GIVEN valid texts WHEN POST /embeddings THEN return vectors[ ] with dimensions and modelUsed.
  - GIVEN invalid payload WHEN POST /embeddings THEN 400 with error.
  - GIVEN query+docs WHEN POST /rerank THEN rankedItems sorted by score and modelUsed.
  - GIVEN msgs WHEN POST /chat AND MLX unavailable THEN fallback model used if policy allows, with audit trail containing runId/traceId.
- Priority: P0 (foundation for all model use)
- Dependencies: MLX runtime availability; Ollama service; policy engine; audit store; config at config/mlx-models.json.
- Technical Constraints: Apple Silicon optimized MLX; localhost 127.0.0.1:8081; timeouts and retry policy; JSON payload size limits.
- UX Considerations: Clear error messages; structured errors with codes; docs with example curl and expected JSON.

1. Feature: A2A Event Bus + Contracts

- User Story: As an orchestrator developer, I want agents to communicate via CloudEvents over A2A subjects, so that boundaries are enforced and flows are observable.
- Acceptance Criteria:
  - GIVEN agent.plan.request WHEN published THEN agent.plan.result follows contract and includes runId, traceId, evidence.
  - GIVEN malformed message WHEN received THEN reject with structured error and OTEL span recorded.
- Priority: P0
- Dependencies: NATS (or broker); contracts library; OTEL tracer.
- Technical Constraints: AsyncAPI subjects stable; backpressure handling (NATS limits); idempotency keys.
- UX Considerations: Developer docs with examples; local compose for quick start.

1. Feature: MCP Universal Manager

- User Story: As a security engineer, I want universal CLI and API to add/list/status MCP servers with risk classification, so that external tools are onboarded safely across frontends.
- Acceptance Criteria:
  - GIVEN https URL + auth WHEN add THEN risk tier computed and policy applied; high risk requires force/approval.
  - GIVEN invalid URL or dangerous domain WHEN add THEN operation blocked with rationale.
- Priority: P1
- Dependencies: Policy framework; storage for registry; HTTP client with validation.
- Technical Constraints: HTTPS enforcement; domain/IP allowlists; API key pattern checks; optional tunnels.
- UX Considerations: Clear risk labels; web UI demo; accessible CLI output.

1. Feature: RAG Pipeline via Gateway

- User Story: As a knowledge engineer, I want embeddings+rereank via the gateway for retrieval, so that we use consistent models and logs.
- Acceptance Criteria:
  - GIVEN corpus indexed WHEN query THEN return top-k with scores and model tags; latency p95 under target.
  - GIVEN MLX failure WHEN query THEN fallback to Ollama embedding model per policy and record fallback reason.
- Priority: P1
- Dependencies: FAISS/Qdrant; gateway; config/model-strategy; caches.
- Technical Constraints: Vector dimensions 768; shard settings; batch sizes.
- UX Considerations: Metrics dashboard; explainability of rerank decisions where possible.

1. Feature: Approvals UI (HITL) a11y-smoke + gates

- User Story: As a reviewer, I want accessible approvals and audit trails, so that risky actions are reviewed and compliant.
- Acceptance Criteria:
  - GIVEN pending approval WHEN keyboard-only THEN all controls reachable with visible focus; Axe checks pass; WCAG 2.2 AA.
  - GIVEN decision WHEN approved/rejected THEN CloudEvent recorded with actor id and reason.
- Priority: P1
- Dependencies: UI app; A2A events; audit log; review policies.
- Technical Constraints: SSR-friendly; OTEL IDs; rate limits on approval actions.
- UX Considerations: Clear states (pending, approved, rejected), empty states, error boundaries.

## Requirements Documentation

1. Functional Requirements

- User flows: plan → gather → critic → synthesize (single-writer) → verify; messages as CloudEvents with runId/traceId/evidence.
- State management: per-run state in memory service with deterministic cleanup; per-agent budgets enforced by policy.
- Data validation: Zod schemas for inputs; contracts library for A2A subjects; JSON schema for HTTP payloads.
- Integrations: MCP servers via universal manager; model-gateway at 127.0.0.1:8081; FAISS/Qdrant; OTEL exporter.

1. Non-Functional Requirements

- Performance: p95—embeddings < 800ms, rerank < 500ms, chat < 2s on MLX; gateway availability > 99% in dev; API p95 < 500ms for /rerank.
- Scalability: handle 50 concurrent embedding requests with bounded concurrency (PM2 or in-proc queue); batch where possible.
- Security: OWASP alignment; HTTPS-only external; API key redaction; risk-tiered MCP onboarding; policy-enforced side effects; rate limiting to be added.
- Accessibility: WCAG 2.2 AA for approvals UI; keyboard navigation; SR labels; no color-only cues.

1. User Experience Requirements

- IA: “Agents,” “Models,” “Policies,” “Runs,” “Approvals.”
- Progressive disclosure: hide advanced model tuning; show fallback info on demand.
- Error prevention: schema validation; confirmation for high-risk actions; dry-run mode.
- Feedback: OTEL trace link per run; audit IDs shown in UI; structured error codes.

## Critical Questions Checklist

- [x] Are we improving on existing solutions? Yes—strict boundaries, audited model gateway, universal MCP security.
- [x] What is the minimum viable version and cut lines? MVP excludes SSE live streaming; focuses on embeddings/rerank/chat over HTTP; approvals smoke only.
- [x] Key risks or unintended consequences? Model drift; insufficient rate limiting; fallback masking MLX outages; incomplete redaction.
- [x] Platform-specific constraints? Apple Silicon MLX optimization; local-only gateway binding; CI concurrency limits.

[ASSUMPTIONS]

- CI gates exist but may not be fully green today across all packages; some tests noted as flaky in docs.
- Model cache directories are available via MLX_CACHE_DIR; Ollama has required models pulled.
- A2A uses NATS and OTEL is available in dev compose.

## Now / Next / Later (MVP plan)

- Now (Sprint 1)
  1. Finish MCP SSE transport and add rate limiting + log redaction.
  2. E2E smoke: agent → A2A → gateway → RAG; assert audit/trace; add to pnpm test:integration.
  3. Compose: NATS, Qdrant/FAISS, gateway:8081, OTEL; health checks + wait scripts.

- Next (Sprint 2) 4) Approvals UI a11y tests (Playwright + Axe); HITL CloudEvents. 5) Stabilize CI: fix lint/type/test; quarantine flaky tests behind :launch gate. 6) Simlab KPIs: precision@k vs latency matrix for 0.6B/4B/8B embeddings and reranker variants.

- Later 7) Structured logging with redaction + key rotation. 8) Replay CLI for any runId/node; link to OTEL traces. 9) Dynamic policy updates and compliance reporting.

## Metrics

- North Star: % of automated runs completing without human intervention while meeting latency SLOs.
- Inputs: p95 per endpoint, fallback rate %, approval rate %, precision@k.
- Guardrails: safety block rate, error budget for 5xx, max concurrency.

## Acceptance Criteria Check

- USP and Success Metrics included: Yes.
- Each feature has Priority, Constraints, UX: Yes.
- Requirements include FR, NFR (WCAG 2.2 AA), UX: Yes.
- Critical Questions completed with [ASSUMPTIONS]: Yes.
- File path exactly project-documentation/product-manager-output.md: Yes.
