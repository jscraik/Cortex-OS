# TDD Plan: Local Memory Hardening

## Task Summary

Elevate the Local Memory integration to meet 2025 brAInwav security, observability, and retrieval
standards while maintaining the local-first guarantee. Work will deliver OAuth-protected REST
access, OTel instrumentation, improved retrieval quality (embeddings + reranker + chunk metadata),
evaluation automation, and compliance tooling updates.

## Scope & Goals

- Harden REST surfaces with OAuth 2.1 + PKCE aligned to MCP authorization spec.
- Ensure Local Memory clients inside Cortex-OS only bind to loopback by default and fail fast on exposure.
- Instrument Local Memory client wrapper and Cortex-OS services with GenAI-aligned OpenTelemetry spans and metrics.
- Upgrade retrieval stack: modern embeddings, reranker, chunk metadata persistence, and
   graph-aware hooks sourced from existing `config/mlx-models.json` and `config/ollama-models.json`
   inventories.
- Introduce automated RAG evaluation (Ragas) and GDPR-compliant erasure flows.
- Migrate license storage into 1Password CLI (default) with secure fallback for other OS targets.

## Out of Scope

- Implementing distributed replication (Litestream/LiteFS) in this iteration; document follow-up.
- UI/editor configuration updates already handled in prior setup.

## Testing Strategy (Write First)

1. **Security & Auth**
    - `apps/cortex-os/packages/local-memory/__tests__/auth-handler.spec.ts`: failing test asserting
       OAuth 2.1 PKCE token issuance flow and rejection of missing/expired tokens.
    - Integration test hitting `local-memory` REST via mocked `fetch` to confirm loopback
       enforcement and HTTP 403 when external IP detected.

2. **Observability**
   - `apps/cortex-os/packages/local-memory/__tests__/telemetry.spec.ts`: expect spans
     `gen_ai.retrieval`, `gen_ai.reranker`, `gen_ai.generation` with brAInwav attributes.
   - Snapshot test verifying metrics emitter includes token counts and model identifiers.

3. **Retrieval Quality**
    - Unit tests for new chunker service in `packages/rag` verifying segmentation outputs stable
       hashes.
    - Integration test ensuring reranker reorders results and records provenance metadata while
       asserting the loader selects `qwen3-reranker` from `config/mlx-models.json` when available.
    - Configuration loader test stubbing `config/ollama-models.json` to verify embedding fallbacks
       resolve to installed `qwen3-embed` without triggering network pulls.

4. **Evaluation Harness**
   - CLI smoke test: `pnpm test local-eval` ensures Ragas job runs and fails on regression scenario.

5. **Compliance**
   - Tests for erasure endpoint clearing SQLite rows, Qdrant vectors, and graph edges; verify audit log entry contains brAInwav branding.

6. **License Storage**
   - Unit test faking macOS Keychain responses to ensure secrets stored/retrieved securely and plaintext file fallback disabled.

## Implementation Checklist

1. **Security Hardening**
   - Implement OAuth 2.1 + PKCE middleware for Local Memory REST adapter within Cortex-OS.
   - Add boot-time loopback exposure self-check; log failures with brAInwav branding.
   - Refactor configuration loader to enforce loopback defaults and central YAML validation.

2. **Telemetry Instrumentation**
   - Wrap Local Memory client calls with OTel spans using GenAI semantic conventions; include token usage + model metadata.
   - Configure default exporter (OTLP/HTTP to local collector) and feature flag for disabling in tests.

3. **Retrieval Upgrades**
    - Introduce embedding profile manager that reads `config/mlx-models.json` and
       `config/ollama-models.json`, preferring MLX `qwen3-4b` and falling back to Ollama
       `qwen3-embed` or other available entries without additional downloads.
    - Build reranker adapter that first binds to MLX `qwen3-reranker` (4B) via local path and exposes
       a configuration toggle for future Ollama reranker entries.
    - Persist chunk metadata (algorithm, hash, sequence) and expose via API responses.
    - Prepare GraphRAG hooks leveraging existing relationships service.

4. **Evaluation & Compliance**
   - Create `local-eval/` dataset and Vitest harness invoking Ragas metrics; wire into CI target `pnpm test:rag-eval`.
   - Add GDPR erasure endpoint + audit logging and corresponding CLI command.

5. **License & Secrets Handling**
   - Replace `license.json` usage with 1Password CLI integration; provide environment override and document fallback for other OSes.

6. **Docs & Governance**
   - Update `CHANGELOG.md`, relevant README docs, and website notes with new capabilities.
   - Add SBOM/Cosign guidance placeholders for follow-up release process.

## Risks & Mitigations

- **Model Footprint**: Leveraging MLX `qwen3-reranker` may still increase memory pressure.
   Mitigation: gate via config flag and document fallback to lighter Ollama embeddings only.
- **OAuth Complexity**: PKCE flows increase implementation work. Mitigation: reuse existing brAInwav auth utilities and add integration tests.
- **Telemetry Overhead**: Extra spans may affect latency. Mitigation: provide sampler configuration and disable for tests.

## Success Criteria

- All new tests pass with ≥90% coverage.
- Local Memory REST endpoints reject unauthenticated requests and bind to loopback only.
- Observability dashboards show GenAI spans with brAInwav-branded attributes.
- Ragas metrics integrated into CI with baseline thresholds.
- License data no longer stored in plaintext.
