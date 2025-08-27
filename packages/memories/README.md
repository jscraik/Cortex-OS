<!--
This README.md file follows WCAG 2.1 AA accessibility guidelines:
- Clear document structure with semantic headings
- Descriptive link text
- High contrast content organization
-->

# @cortex-os/memories

Production-grade memory module for the ASBR Runtime. Provides unified memory service with Neo4j graph storage and Qdrant vector search integration.

## Overview

This package is a **shared library** in the ASBR architecture, providing memory services to feature packages mounted by the ASBR Runtime (`apps/cortex-os/`).

## Features

- ESM-only, TypeScript, tsup builds
- Hexagonal ports (MemoryStore, Embedder) with swappable adapters
- JSON Schema + Zod for validation; Python client uses Pydantic
- In-memory adapter for tests; Prisma/Postgres for prod; SQLite stub placeholder
- OpenTelemetry spans in service methods
- Neo4j graph storage with Qdrant vector search

## Installation

```bash
pnpm add @cortex-os/memories
```

## Usage

```ts
import { MemoryService, buildContextWindow } from "@cortex-os/memories";

const service = new MemoryService({
  neo4jUrl: "bolt://localhost:7687",
  neo4jUser: "neo4j",
  neo4jPassword: "password",
  qdrantUrl: "http://localhost:6333",
});

// Ensure Qdrant collection exists (vector size must match embeddings)
await service.init({ vectorSize: 1536, distance: "Cosine" });

await service.addMemory({
  id: "example",
  text: "Hello, Cortex OS!",
  embedding: Array(1536).fill(0.5),
});

// Search by vector
const results = await service.searchMemories(Array(1536).fill(0.5));

// Optional: build a compact context window from results
const enriched = results.map((r) => ({
  ...r,
  content: r.text,
  type: "context",
  confidence: 1,
  timestamp: new Date().toISOString(),
}));
const { entries } = buildContextWindow(enriched, 1000, "relevant");
console.log(entries[0]?.text);
```

## Scripts

- `pnpm build` – build with tsup
- `pnpm test` – run unit tests with Vitest
- `pnpm prisma:gen` – generate Prisma client
- `pnpm db:migrate` – deploy Prisma migrations

## Integration with ASBR Runtime

The MemoryService is bound in `apps/cortex-os/src/boot.ts` and exposes HTTP routes:

- `POST /memories` - Create memory
- `GET /memories/:id` - Retrieve memory
- `POST /memories/search` - Search memories

## Testing

Run unit tests:

```bash
pnpm test packages/memories
```

Integration test (requires Neo4j + Qdrant running):

```bash
MEMORY_INTEGRATION=true pnpm test packages/memories
```

## Development Setup

Minimal Docker Compose to start services locally:

```yaml
version: '3.9'
services:
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - '6333:6333'
    volumes:
      - qdrant_data:/qdrant/storage

  neo4j:
    image: neo4j:5
    environment:
      - NEO4J_AUTH=neo4j/password
    ports:
      - '7687:7687' # bolt
      - '7474:7474' # http (optional)
    volumes:
      - neo4j_data:/data

volumes:
  qdrant_data:
  neo4j_data:
```

### Service Health Check

Verify services before running integration tests:

```bash
# Qdrant should return "ok"
curl -s http://localhost:6333/readyz && echo

# Optional: list (or auto-created) collections
curl -s http://localhost:6333/collections | jq .

# Neo4j: ensure bolt is reachable; if cypher-shell is installed
cypher-shell -a bolt://localhost:7687 -u neo4j -p password "RETURN 1 AS ok"
```

## Upgrade Path

- Add pgvector + ANN for vector search
- Add policy enforcement and compaction jobs

## Accessibility

This module follows WCAG 2.1 AA accessibility guidelines. All interactive elements are keyboard accessible and screen reader compatible.
