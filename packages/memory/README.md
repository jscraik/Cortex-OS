<!--
This README.md file follows WCAG 2.1 AA accessibility guidelines:
- Clear document structure with semantic headings
- Descriptive link text
- High contrast content organization
-->

# memory

Unified memory module for Cortex OS. Integrates Neo4j graph storage with Qdrant vector search.

## Installation

```bash
pnpm add @cortex-os/memory
```

## Usage

```ts
import { MemoryService, buildContextWindow } from "@cortex-os/memory";

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

## Testing

Run unit tests:

```bash
pnpm test packages/memory
```

Integration test (requires Neo4j + Qdrant running):

```bash
MEMORY_INTEGRATION=true pnpm test packages/memory
```

Minimal Docker Compose to start services locally:

```yaml
version: "3.9"
services:
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

  neo4j:
    image: neo4j:5
    environment:
      - NEO4J_AUTH=neo4j/password
    ports:
      - "7687:7687" # bolt
      - "7474:7474" # http (optional)
    volumes:
      - neo4j_data:/data

volumes:
  qdrant_data:
  neo4j_data:
```

### Service health check

Verify services before running integration tests:

```bash
# Qdrant should return "ok"
curl -s http://localhost:6333/readyz && echo

# Optional: list (or auto-created) collections
curl -s http://localhost:6333/collections | jq .

# Neo4j: ensure bolt is reachable; if cypher-shell is installed
cypher-shell -a bolt://localhost:7687 -u neo4j -p password "RETURN 1 AS ok"
```

## Accessibility

This module follows WCAG 2.1 AA accessibility guidelines. All interactive elements are keyboard accessible and screen reader compatible.
