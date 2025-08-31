# Cortex WebUI PRD (Open-WebUI Reference)

This document summarizes a re-audit of **open-webui/open-webui** and maps its lessons to a Cortex-branded, TypeScript-first implementation. No external code is copied; names remain `cortex-*`.

## 1. File Map (Reference)

Open WebUI root structure (selected):

```
.github/              workflows and CI scripts
backend/              Python FastAPI backend
src/                  Svelte/TS frontend
cypress/              e2e tests
kubernetes/           deployment manifests
scripts/              maintenance scripts
docs/                 project docs
static/               static assets
test/                 backend tests
image_gen/            image generation helpers
```

**Cortex mirroring**: scaffold `apps/cortex-webui` with empty `src/` and `backend/` directories only. Additional Cortex packages live at repo root under `packages/`.

## 2. License Posture

- `open-webui` ≥ v0.6.6: **Open WebUI License** (BSD-3 base + branding preservation). Not compatible with Cortex branding; treat as reference only.
- `open-webui` ≤ v0.6.5: BSD-3; historic code usable with notices if policy allows.
- **Cortex WebUI**: ship under **MIT**, maintain independent docs and governance files.

## 3. Strengths & Weaknesses Observed

| Area | Strengths | Weaknesses / Guardrails |
|---|---|---|
| Model routing | Multi-runner (Ollama + OpenAI-compatible) | OpenAPI adapter failures on non-JSON content |
| Access control | RBAC, groups, SCIM 2.0 | Intermittent 500/502s under load |
| UX | PWA, local RAG via `#file`, model builder, BYO Python tools, web search/browsing injection | Keyboard shortcut inconsistencies |
| Tooling | Supports custom Python tools | Playwright/Chromium version drift |

## 4. GitHub Actions & Models Plan

Replicate OWUI workflow names:

- **CodeQL** security scan
- **Frontend Build** for TypeScript/Svelte bundling
- **Python CI** for backend checks
- **Create and publish Docker images** with build args
- **Playwright E2E** tests
- **Deploy preview** (e.g., to HF Spaces or similar)

Model access through `packages/model-gateway` exposing:

- `POST /v1/chat/completions`
- `POST /v1/embeddings`
- Tool-call webhook support

## 5. Ordered Implementation Steps

1. Scaffold `apps/cortex-webui` with empty `src/` and `backend/` trees.
2. Elevate `packages/model-gateway` to proxy `/v1/chat/completions`, `/v1/embeddings`, and tool calls.
3. Add `packages/functions` (schema-validated in-process tools) and `packages/pipelines` (Worker Threads + optional Docker sandbox with allow-list, timeouts, signing).
4. Implement `packages/rag` with local file ingestion (`#file` autocomplete) and provenance tracking.
5. Harden `packages/mcp-bridge` and `packages/mcp-registry` via signed manifests and per-tool rate limits.
6. Recreate CI with workflows named after OWUI counterparts: Docker images, Frontend Build, Python CI, CodeQL, Playwright E2E, Deploy preview.
7. Maintain MIT licensing and avoid importing Open WebUI code or text.

## 6. AI Engineering Roadmap Integration

Review of [`jamiescottcraik/ai-engineering-roadmap`](https://github.com/jamiescottcraik/ai-engineering-roadmap) highlights complementary features:

- **Interactive roadmap UI** with progress tracking and local storage
- **Backend endpoints** for `/health`, `/roadmap/fix-sequence`, and `/ollama/sync`
- **Ollama status card** for local model availability

Early Cortex adoption:

1. Added TypeScript stubs in `apps/cortex-webui/backend/roadmap.ts` for the roadmap endpoints with Zod validation.
2. Future UI: visualize roadmap data, show progress, and expose Ollama model status.
3. Roadmap data can live under `packages/rag` or a dedicated `packages/roadmap` module.

