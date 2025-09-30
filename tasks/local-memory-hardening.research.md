# Local Memory Hardening Research (2025-09-30)

## Objective

Strengthen the brAInwav Local Memory deployment so it aligns with 2025 best practices across security, retrieval quality,
observability, and compliance while preserving the local-first workflow.

## Current State Observations

- **Binary & Runtime**: `local-memory` 1.1.0 installed at `/opt/homebrew/bin/local-memory`; daemon reachable on
  `http://localhost:3002/api/v1`. License active (LM-D4***BA2).
- **Config**: `~/.local-memory/config.yaml` enables REST (`auto_port: true`, default 3002) with Ollama/Qdrant autodetect.
  SQLite DB `unified-memories.db`; Qdrant acceleration enabled.
- **Services Running**: Qdrant 1.15.4 binary located under `~/.local-memory/qdrant`; Ollama 0.12.0 with models
  `nomic-embed-text`, `qwen2.5:3b`, and others.
- **Integration**: VS Code MCP wrapper `tools/mcp/wrap_local_memory.sh` launches the binary, but Cortex-OS runtime still
  depends on in-memory adapters.
- **Security**: REST server lacks OAuth 2.1 with PKCE; license stored as plaintext JSON in `~/.local-memory/license.json`;
  no network exposure audits.
- **Observability**: No OpenTelemetry traces or metrics emitted by Local Memory daemon or wrappers; Cortex-OS lacks GenAI
  semantic convention integration.
- **Retrieval Flow**: SQLite primary storage plus Qdrant vector search; no reranker; embeddings set to `qwen2.5:7b`
  (chat) and `nomic-embed-text` (embedding) via Ollama autodetect; no semantic chunk metadata persisted.
- **Evaluation**: No automated RAG metrics (Ragas) or regression harness present in the repository.

## External Standards & References

- **Security**: MCP Authorization spec (2025-03-26) mandates OAuth 2.1 PKCE flows for HTTP integrations.
- **Observability**: OpenTelemetry GenAI semantic conventions define spans for retrieval, generation, and token
  accounting.
- **Retrieval Quality**: Hugging Face BGE reranker v2 and Nomic Embed Text v2 recommended for 2025 RAG stacks; Qdrant
  1.15 text indexing and tokenization improvements.
- **Chunking/Graph**: GraphRAG guidance (Microsoft) and ACL 2025 findings on dynamic chunking highlight accuracy gains.
- **Compliance**: GDPR Article 17 erasure plus emerging EU AI Act timelines covering GPAI transparency and high-risk
  obligations.
- **Durability**: Litestream and LiteFS stand out as modern SQLite resilience patterns.

## Constraints & Considerations

- Must retain brAInwav local-first (loopback-only, zero exfiltration) principles.
- Need to preserve existing MCP tooling interfaces and respect Cortex-OS standards (named exports, functions at or below
  40 lines, async/await usage).
- Changes must integrate with the Nx workspace; instrumentation should be optional but enabled by default locally.
- Licensing data must migrate without breaking current activation.

## Open Questions

1. Should OAuth identity provider run locally (embedded) or delegate to an existing brAInwav auth service?
2. Do we target both MCP stdio and REST simultaneously, or phase improvements (REST first)?
3. Preferred reranker deployment: Ollama-hosted model or bundled ONNX runtime?
4. What storage footprint is acceptable for additional models and chunk metadata?
