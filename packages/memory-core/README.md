# Cortex-OS Local Memory Refactor

## Overview

This directory contains the working documentation and task artifacts for the comprehensive refactor of the Cortex-OS Local Memory system. The refactor aims to create a unified, production-ready memory architecture that eliminates duplication and establishes clear separation of concerns.

## Objectives

### Primary Goals

1. **Unify Memory Implementation** - Consolidate duplicate memory code from `packages/memories` and `packages/rag` into a single `memory-core` package
2. **Thin Adapter Pattern** - Create lightweight adapters (MCP, REST, Agent-Toolkit) that delegate to `memory-core`
3. **Agent-Toolkit Integration** - Enable first-class agent-toolkit tool support with proper tools path resolution
4. **A2A Event Emission** - Emit events for all memory operations for observability and orchestration
5. **Token Budget Enforcement** - Implement 40K token cap with 20K trimming for search results

### Architecture Principles

- **Single Source of Truth** - `memory-core` contains all business logic
- **No Duplication** - Remove duplicate memory implementations across packages
- **Event-Driven** - All operations emit A2A events for cross-service communication
- **Transport Agnostic** - Support STDIO, HTTP/streamable, and REST access patterns
- **Local Development** - Support `$HOME/.Cortex-OS/tools/agent-toolkit` for local tool installation

## Documents

### Core Planning

- **[TDD Plan](./mcp-and-memory-tdd-plan.md)** - Comprehensive 12-phase Test-Driven Development plan with detailed implementation guidance, checklists, and Docker Compose deployment architecture

### Additional Artifacts

- **[Local Memory Hardening Baseline](./local-memory-hardening-baseline.md)** - Security and production readiness requirements

## Architecture Diagram

```markdown
┌─────────────────────────────────────────────────────────────┐
│                    Clients                                  │
├──────────┬──────────┬──────────┬──────────┬───────────────┤
│ Claude   │ ChatGPT  │ VS Code  │ Editors  │ Others        │
│ Desktop  │          │          │          │               │
└─────┬────┴─────┬────┴─────┬────┴─────┬────┴─────┬─────────┘
      │          │          │          │          │
      │          │          │          │          │
┌─────▼─────┐  ┌─▼──────────▼──────────▼──────────▼─┐
│ cortex-   │  │       brAInwav MCP Hub            │
│ os (app)  │  │       (FastMCP v3)                │
└───────────┘  └─────┬──────────────────────┬──────┘
                      │                      │
                ┌─────▼─────┐          ┌─────▼─────┐
                │ rest-api  │          │ agent-    │
                │ (gateway) │          │ toolkit   │
                └───────────┘          └───────────┘
                      │                      │
                      └──────────┬───────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     memory-core         │
                    │   (Single Source of     │
                    │      Truth)             │
                    │                         │
                    │ • memory.store()        │
                    │ • memory.search()       │
                    │ • memory.analysis()     │
                    │ • memory.relationships()│
                    │ • memory.stats()        │
                    │ • memory.hybrid_search()│ ← Aggregates local + remote
                    └──────────┬─────────────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
                    ▼          ▼          ▼
            ┌─────────────┐ ┌──────────────────┐ ┌──────────────────┐
            │  SQLite     │ │ Optional Qdrant  │ │ Pieces MCP Proxy │
            │ (canonical) │ │ (vector search)  │ │ (remote LTM)     │
            │             │ │                  │ │                  │
            │ • Memories  │ │ • Embeddings     │ │ • localhost:     │
            │ • Metadata  │ │ • Semantic       │ │   39300          │
            │ • Relations │ │   similarity     │ │ • ask_pieces_ltm │
            └─────────────┘ └──────────────────┘ └──────────────────┘
```

## Deployment Architecture

The refactor includes a comprehensive Docker Compose setup that provides:

- **Service Containerization** - Each service in its own container with proper isolation
- **Health Checks** - All services include readiness and liveness probes
- **Bind Mounts** - Agent-toolkit tools mounted from `$HOME/.Cortex-OS/tools/agent-toolkit`
- **Transport Support** - STDIO, HTTP/streamable, and REST endpoints
- **Observability** - A2A event emission for all operations

See the [Docker Compose Architecture](./mcp-and-memory-tdd-plan.md#docker-compose-deployment-architecture) section in the TDD plan for detailed configuration.

## Pieces MCP Integration

The `memory-core` package integrates with **Pieces OS Long-Term Memory** via the brAInwav MCP Hub. This provides:

### Hybrid Memory Architecture

- **Local Memory**: SQLite-backed canonical storage with optional Qdrant vector search
- **Remote Memory**: Pieces OS LTM running on host (localhost:39300)
- **Hybrid Search**: Aggregates results from both local and remote sources via `memory.hybrid_search()`

> 💡 **Pro Tip — Turbocharge Local Memory MCP**: Running a local Qdrant instance drops semantic search latency from ~100 ms to <10 ms for large corpora. Local Memory auto-detects Qdrant and falls back to SQLite when it is unavailable, so you can opt-in without risking downtime.

### Install and Run Qdrant Locally

Qdrant provides pre-built binaries for macOS, Linux, and Windows. See the [Qdrant installation guide](https://qdrant.tech/documentation/quick-start/) for the latest instructions for your platform.

**macOS (Apple Silicon or Intel):**

```bash
# Download, unpack, and start Qdrant (macOS)
curl -L https://github.com/qdrant/qdrant/releases/latest/download/qdrant-x86_64-apple-darwin.tar.gz -o qdrant.tar.gz
tar -xzf qdrant.tar.gz && chmod +x qdrant && mkdir -p ~/.local-memory && mv qdrant ~/.local-memory/
cd ~/.local-memory && ./qdrant &
With Qdrant running, Local Memory automatically enables vector indexing and hybrid search acceleration—no extra configuration required. Power users can then scale to millions of memories while maintaining consistent <10 ms retrieval times.

### Integration Pattern

The integration uses a **proxy pattern** in the MCP server to avoid code duplication:

```typescript
// MCP Hub connects to Pieces OS via SSE transport
const piecesProxy = new PiecesMCPProxy({
  endpoint: 'http://localhost:39300/model_context_protocol/2024-11-05/sse',
  enabled: process.env.PIECES_MCP_ENABLED === 'true',
});

// Hybrid search aggregates local + remote results
async function hybridSearch(query: string) {
  const localResults = await memoryProvider.search({ query });
  const piecesResults = await piecesProxy.callTool('ask_pieces_ltm', { question: query });
  
  return {
    local: localResults.map(r => ({ ...r, source: 'cortex-local' })),
    remote: piecesResults.map(r => ({ ...r, source: 'pieces-ltm' })),
    combined: mergeAndRerank(localResults, piecesResults),
  };
}
```

### Environment Configuration

```bash
# Enable Pieces integration
PIECES_MCP_ENABLED=true

# Pieces OS endpoint (SSE transport)
PIECES_MCP_ENDPOINT=http://localhost:39300/model_context_protocol/2024-11-05/sse
```

### Docker Compose Configuration

When deploying with Docker Compose, Pieces OS runs on the host:

```yaml
services:
  cortex-mcp:
    environment:
      - PIECES_MCP_ENDPOINT=http://host.docker.internal:39300/model_context_protocol/2024-11-05/sse
      - PIECES_MCP_ENABLED=true
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

See `packages/mcp-server/README.md` for complete integration documentation.

## Progress Tracking

The refactor follows a strict 12-phase TDD approach:

- **Phase 0** - Baseline & Safety Nets (Current phase)
- **Phase 1** - Core Memory Refactor
- **Phase 2** - Adapter Layer Creation
- **Phase 3** - MCP Server Refactor
- **Phase 4** - Agent-Toolkit Integration
- **Phase 5-12** - Additional features and production hardening

Each phase includes:

- ✅ Pre-requisites verification
- 🧪 Test writing (TDD red phase)
- 🟢 Implementation (TDD green phase)
- 🔄 Refactoring (TDD refactor phase)
- ✅ Validation gates

## Success Criteria

1. **No Code Duplication** - Single memory implementation in `memory-core`
2. **Production Ready** - Docker Compose deployment with health checks
3. **Full Test Coverage** - 90%+ coverage across all components
4. **Event-Driven** - A2A events for all operations
5. **Multi-Transport** - STDIO, HTTP, and REST access
6. **Agent-Toolkit Ready** - Tools path resolution working
7. **Memory Management** - Token budget enforcement implemented
8. **Documentation** - Comprehensive docs for architecture, deployment, and usage

## Definition of Done
- [ ] CRUD/search; retention; export/import; vector adapters (local first).

## Test Plan
- [ ] Deterministic IDs; search recall smoke; retention policy unit tests.

> See `CHECKLIST.cortex-os.md` for the full CI gate reference.

