# Open WebUI compatibility (clean-room)

This note documents what Cortex-OS can learn from Open WebUI while remaining Apache/commercial friendly. We will not copy code, assets, or text from Open WebUI; instead we reimplement concepts and interfaces in a clean-room fashion.

## Summary

- Source: <https://github.com/open-webui/open-webui> (custom BSD-3 + branding lock). Not Apache-compatible for code reuse.
- Approach: adopt ideas and interface shapes; implement original code and assets under Apache-2.0.
- Optional external integration: support Open WebUI as a remote UI speaking our OpenAI-compatible API; no embedding of their code/branding.

## Features to reimplement (concepts only)

- Chat UX: multi-model sessions, per-message routing, attachments, citations.
- RAG UX: document library, `#document` linking, web search injection, URL browsing into context.
- Tools (BYOF): user-provided functions with schema, sandboxed execution with resource/time caps.
- Voice/Video: optional WebRTC with STT/TTS integration.
- PWA/offline UI cache (not model downloads) for mobile.

## Integrations and contracts

- OpenAI-compatible gateway from ASBR: route to Ollama, OpenAI, Groq, Mistral, OpenRouter via DI and MCP tools.
- RBAC/SCIM 2.0: user/group provisioning maps to A2A identities; fine-grained permissions for models/features.
- Plugin system: unify around MCP tool manifests and zod-validated IO contracts in `libs/typescript/contracts`.
- RAG services: embeddings/chunking pipelines, user/shared indices, offline toggle env.
- Web search providers: adapters for SearXNG/Brave/Bing/Tavily via MCP manager.

## Architecture alignment with Cortex-OS

- Keep domain boundaries: no cross-feature imports; communicate via A2A broker and service interfaces.
- Mount features in ASBR runtime (`apps/cortex-os/`) via DI.
- Web app (`apps/cortex-web/`) adopts similar UX patterns but original implementation (Svelte/React ok). No shared code with Open WebUI.
- Tests: unit (vitest), e2e (playwright), a11y gates.

## Deployment patterns we can mirror

- Single container images with CPU/CUDA variants; compose profiles and named volumes for DB/indices.
- Env-first configuration; explicit offline mode flag.
- Optional Watchtower-style update guidance.

## Compliance rules

- Do not copy code, assets, docs, or schemas from Open WebUI.
- Do not use or modify Open WebUI branding.
- Cite Open WebUI as inspiration only.

## Milestones

1. OpenAI-compatible API surface (read-only chat) exposed through ASBR.
2. RAG service MVP with doc library and embeddings search events.
3. MCP/BYOF function tools with sandboxed execution and contracts.
4. RBAC/SCIM provider and policy checks integrated into ASBR.
5. Web UI: initial chat + RAG panels; PWA shell; i18n skeleton.

## Risks

- License contamination if any code/assets are copied.
- UI scope creep; keep MVP small and iterate.

## References

- Open WebUI README and LICENSE (branding clause). We avoid code reuse and branding; we build independently under Apache-2.0.
