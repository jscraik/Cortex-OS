# brAInwav GraphRAG for Cortex-OS

GraphRAG augments Cortex-OS retrieval flows with a 1-hop knowledge graph stored in Prisma (SQLite/PostgreSQL) and vectors stored in Qdrant. This document captures the operational contract for ingestion, retrieval, and adapter exposure.

## Storage Schema

- **GraphNode / GraphEdge**: Prisma models mapping durable entities (packages, services, contracts, docs, tools).
- **ChunkRef**: Links graph nodes to Qdrant point IDs and source file spans.
- **Policy**: `config/retrieval.policy.yaml` constrains expansion (edge whitelist, hop limit, neighbor cap) and chunk budgets.

Run migrations and regenerate the Prisma client before ingestion:

```bash
pnpm prisma migrate deploy
pnpm prisma generate
```

## Ingestion Pipeline

1. Invoke `pnpm --filter @cortex-os/memory-core graph:ingest` to populate nodes, edges, and chunk references.
2. The script leverages Agent Toolkit scanners (dependency-cruiser, Nx graph) to derive PACKAGE/SERVICE relationships, tool contracts, docs, and ports.
3. Source and documentation text is chunked, embedded, and upserted into Qdrant with named vectors (`dense`, `sparse`).
4. Each Qdrant point ID is persisted via `ChunkRef` to maintain traceability.

In CI, prefer affected ingestion by using Nx affected project lists to avoid full re-chunking.

## Retrieval Flow

1. **Hybrid seed search**: `QdrantHybridSearch` issues a single Query API call combining dense + sparse vectors.
2. **Node lift**: Seed Qdrant IDs map to graph nodes through `ChunkRef.qdrantId`.
3. **Expansion**: `expandNeighbors` queries Prisma for allowed edges, respecting the neighbor cap.
4. **Context assembly**: `assembleContext` prioritizes DOC/ADR/CONTRACT nodes, deduplicates by path/span, and returns ≤24 chunks.
5. **Response**: `GraphRAGService` packages sources, graph context metrics, and optional citations with brAInwav branding.

## Adapter Exposure

- **REST**: `/api/v1/graphrag/query`, `/health`, `/stats` in `packages/memory-rest-api` forward requests to `GraphRAGService`.
- **MCP**: `graphrag.query` tool in `packages/cortex-mcp` targets the REST endpoint.

Ensure MCP and REST adapters emit brAInwav-branded headers and structured JSON responses.

## Observability & SLOs

- Target pre-LLM retrieval latency ≤350 ms (P95).
- Log query ID, k, neighbor count, and chunk count per request.
- Emit A2A events via `GraphRAGService.emitQueryEvent` for auditability.

## Testing

- Run `pnpm --filter @cortex-os/memory-core test -- --runInBand` for GraphRAG unit tests.
- Exercise REST endpoints with supertest or curl against the local server.
- Validate swagger updates via `pnpm --filter @cortex-os/memory-rest-api test` (if available).

## Operational Notes

- Configure `MEMORY_GRAPH_DB_URL` to target the dedicated Prisma datasource when running GraphRAG independently; falls back to `DATABASE_URL`.
- Ensure `QDRANT_URL` and embedding environment variables are set for production deployments.
- For staging, throttle ingestion jobs to avoid Qdrant hot spots; neighbor caps prevent hub overload.

For additional guidance, consult the GraphRAG tests and policy file, and file issues in the `project-documentation/` area when expanding schema coverage.
