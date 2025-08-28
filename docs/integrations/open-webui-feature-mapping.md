# Cortex-Web × Open WebUI feature mapping (clean‑room)

This document inventories relevant Open WebUI capabilities and maps them to Cortex-Web requirements and architecture. It is a clean-room analysis: we do not copy code, assets, or text; we summarize concepts and interface shapes only.

- Source for inspiration: <https://github.com/open-webui/open-webui>
- License note: Open WebUI uses a revised BSD-3 with branding clause; we must not reuse code/branding. Cortex remains Apache-2.0. See `docs/integrations/open-webui-compatibility.md` for policy.

## Cortex-Web capability requirements (from architecture)

Grounded in `AGENTS.md`, `docs/agent-architecture.md`, and repo policies:

- Chat operations
  - Connect to OpenAI-compatible gateway exposed by ASBR; multi-model routing; streaming; message history.
  - Attachments and citations plumbing to/from RAG pipeline.
- RAG operations
  - Document library (upload, ingest, list, delete), per-user and shared indices.
  - Web search and web browse enrichment; URL capture/crawl into context (respect robots, rate limits).
- Tools and MCP
  - BYOF/tools UI backed by MCP manager and security policies; per-tool schemas with Zod; resource caps.
  - HITL approvals for sensitive operations (dataClass/policy gates) with a11y-first UI.
- Identity and governance
  - RBAC roles and optional SCIM 2.0 provisioning alignment; policy-driven feature visibility.
- UX quality gates
  - Accessibility (Playwright a11y tests), i18n scaffolding, dark/light themes.
  - PWA shell for offline UI cache (no model download).
- Observability & safety
  - Audit events (CloudEvents), session/run tracing, rate limiting guards.

## Open WebUI capabilities (concepts summary)

Categories paraphrased from their README/docs (no text reuse):

- Models and chat
  - Works with OpenAI-compatible APIs and Ollama; simultaneous multi-model conversations; streaming; markdown/LaTeX rendering.
- RAG and knowledge
  - Local document library; reference docs in chat with hash-style tags; built-in vector search; web search injectors; website content integration.
- Tools and pipelines
  - User-provided Python functions and a plugin/pipeline framework to extend behavior; usage monitoring hooks.
- Media
  - Optional voice/video calling; STT/TTS; image generation via local/external engines.
- Enterprise features
  - RBAC with granular permissions; user/group provisioning using SCIM.
- UX platform
  - Responsive design; PWA; i18n; theming.
- Deployment
  - Docker/K8s variants, CPU/GPU images, offline mode flag.

## Feature mapping to Cortex-Web

For each capability, we map status and integration approach consistent with ASBR DI, A2A messaging, MCP tools, and RAG libs.

### 1) Chat and models

- Open WebUI concept: Multi-model, OpenAI-compatible, streaming, markdown/LaTeX.
- Cortex approach:
  - Use ASBR OpenAI-compatible gateway (DI to Ollama/OpenAI/Groq/Mistral/OpenRouter).
  - Client: React (Next.js) chat with SSE streaming; markdown render; math typesetting.
  - Multi-model per message via request headers/body to gateway.
- Status:
  - Gateway: partial via ASBR; confirm endpoints in `apps/api` (planned) or expose through `apps/cortex-os` interfaces.
  - UI: to be implemented in `apps/cortex-web/app/chat` (new).

### 2) RAG document library and citations

- Open WebUI concept: Upload docs, library browsing, #doc linking, vector search.
- Cortex approach:
  - Backed by `@cortex-os/rag` (chunk, embed, store, retrieve). Storage via FAISS/Qdrant per environment.
  - UI panels for uploads, ingestion status, search previews; message composer supports inline references; server returns citations.
- Status:
  - Lib exists (`packages/rag`), indices configuration via ASBR; UI not yet present.

### 3) Web search and browsing enrichment

- Open WebUI concept: Inject search results from multiple providers; add website content.
- Cortex approach:
  - Use MCP-managed search providers (SearXNG/Brave/Bing/Tavily adapters) and a crawler API.
  - Existing: simple crawl endpoint `apps/cortex-web/app/api/crawl` with Playwright Crawler; expand to respect robots, depth, caps.
- Status:
  - Crawl MVP present with UI at `app/crawl`; search adapters via MCP manager planned.

### 4) Tools/BYOF and MCP

- Open WebUI concept: Python function tools and pipelines.
- Cortex approach:
  - MCP tool registry and sandboxing (see `packages/mcp-bridge`, `packages/asbr` policies). Zod-validated IO contracts; resource/time limits; audit trails.
  - UI to add/check/approve MCP servers via `WebMcpInterface`; tie-in to HITL.
- Status:
  - Backend interfaces present; web endpoints to be surfaced; UI to add in `apps/cortex-web/app/tools`.

### 5) HITL approvals

- Open WebUI concept: N/A (implicit moderation workflows).
- Cortex approach:
  - Dedicated a11y-first approvals UI backed by JSONL store (`/app/api/approvals`).
- Status:
  - Implemented (pages at `app/approvals`, route `app/api/approvals/route.ts`).

### 6) Voice/Video and image generation

- Open WebUI concept: Voice/video calls; STT/TTS; image gen via local/external backends.
- Cortex approach:
  - Optional: WebRTC + media MCP tools; TTS/STT via MCP servers; image gen via adapters (OpenAI, AUTOMATIC1111, ComfyUI).
- Status:
  - Deferred; define interfaces in `libs/typescript/contracts` before UI.

### 7) RBAC and SCIM 2.0

- Open WebUI concept: Admin roles, group permissions, SCIM provisioning.
- Cortex approach:
  - Policy-driven feature flags; optional SCIM adapter mapping to A2A identities. Enforce at gateway and UI.
- Status:
  - Planned; policy engine exists in orchestration; UI controls TBD.

### 8) UX platform: PWA, i18n, a11y

- Open WebUI concept: PWA, i18n, responsive.
- Cortex approach:
  - Next.js PWA shell, locale files, Tailwind; Playwright accessibility gate.
- Status:
  - a11y tests infra present; PWA/i18n scaffolding to add.

### 9) Observability and safety

- Open WebUI concept: Usage monitoring via plugins.
- Cortex approach:
  - CloudEvents audit log, OTEL spans, request rate limiting, HITL annotations.
- Status:
  - Audit primitives exist; wire to web endpoints; add rate limiting middleware.

### 10) Deployment and offline mode

- Open WebUI concept: Docker/K8s; CPU/GPU images; offline flag; watchtower updates.
- Cortex approach:
  - Compose profiles in `docker/`; CPU/CUDA images for MLX/Ollama; explicit OFFLINE env; doc Watchtower tips.
- Status:
  - Most compose variants exist; document cortex-web PWA and offline considerations.

## Gaps and decisions

- Avoid license contamination: re-implement from concepts only; use MCP/tool contracts and RAG libs.
- Prioritize chat + RAG basics, MCP add/check/approve, and approvals workflow before media features.
- Integrate search/browse via MCP and crawler with strict robots and caps.

## Milestones for Cortex-Web

1. Chat MVP (OpenAI-compatible), streaming, markdown, citations surface. [2 weeks]
2. RAG library UI (upload/ingest/list/search) backed by `@cortex-os/rag`. [2 weeks]
3. MCP tooling UI (add/check/approve servers) + policy gates. [2 weeks]
4. Search/browse integration (providers + crawler controls). [1-2 weeks]
5. PWA shell + i18n skeleton + a11y tests. [1 week]
6. RBAC/SCIM alignment (policy-driven visibility). [defer behind feature flag]
7. Optional media (TTS/STT/WebRTC, image gen) after core stabilized. [deferred]

## Acceptance checks

- Unit: chat request formatting, gateway routing, RAG ingestion/retrieval adapters, MCP server flows.
- E2E: chat stream renders; upload→ingest→retrieve flow; add MCP server→approval gate; crawl a URL (robots respected).
- A11y: pages (`/chat`, `/library`, `/tools`, `/approvals`, `/crawl`) pass axe checks.

## Current assets in repo (tie-ins)

- `apps/cortex-web/app/approvals` and `app/api/approvals`: HITL UI + JSONL store.
- `apps/cortex-web/app/crawl` and `app/api/crawl`: simple crawler MVP using Playwright Crawler.
- `packages/rag`: shared RAG library for chunk/embed/retrieve; to back the library UI.
- `packages/mcp-bridge/src/web-mcp-interface.ts`: web-friendly MCP server management APIs.
- `docs/integrations/open-webui-compatibility.md`: guardrails and high-level plan.

## Next steps (implementation tickets)

- Create `apps/cortex-web/app/chat` with SSE streaming via ASBR gateway; add markdown/LaTeX.
- Create `apps/cortex-web/app/library` (upload/list/search) backed by RAG endpoints.
- Expose web endpoints for MCP add/check/approve via `webMcpInterface`; add `/tools` UI.
- Harden `/api/crawl`: robots.txt, depth/timeout caps, user agent, allowlist.
- Add PWA/i18n scaffolds and Playwright a11y tests for key pages.

— End of document.
