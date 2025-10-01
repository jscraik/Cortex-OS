# Archon Integration Plan

## Candidate Packages for MCP or Async Task Manager

- `packages/agents`: expose a lightweight MCP client to reach external tools.
- `packages/orchestration`: coordinate long-running tasks via a shared async manager.
- `packages/rag`: leverage MCP for remote retrieval services and task manager for document ingestion jobs.

## Prototype MCP Client

A minimal Python MCP client is added under `python/src/cortex_mlx/mcp_client.py`. It issues JSON-RPC 2.0 calls over HTTP and will be adapted into other packages via service boundaries.

## RAG Interoperability PoC

Future work will blend the existing TypeScript RAG pipeline with Archon's Python RAG agent through the MCP client, enabling cross-language retrieval and answer generation.
