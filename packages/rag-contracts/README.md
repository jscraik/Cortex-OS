# @cortex-os/rag-contracts

Shared type contracts between `@cortex-os/rag` and `@cortex-os/agents` packages.

## Purpose

This package breaks the circular dependency that previously existed:
```
rag → agents → rag (CIRCULAR ❌)
```

Now both packages depend on this shared contracts package:
```
rag → rag-contracts ← agents (LINEAR ✅)
```

## Exports

### RAG Event Types
- `RAGEventTypes` - Event type enumeration
- `RagEventEnvelope` - Event envelope interface
- `RagEventHandler` - Event handler interface
- `RagBus` - Event bus interface
- `RagPublishOptions` - Event publishing options

### MCP Client Types
- `AgentMCPClient` - MCP client interface for remote tools
- `KnowledgeSearchFilters` - Search filter options
- `KnowledgeSearchResult` - Search result format
- `MCPIntegrationConfig` - Configuration interface

### Workflow Types
- `WorkflowResult` - Wikidata workflow execution result
- `WorkflowHooks` - Event and persistence hooks
- `WorkflowOptions` - Workflow execution options
- `VectorSearchResult` - Vector search result format
- `FactQueryOptions` - Fact query routing options
- `Store` - Local storage interface

## Usage

```typescript
import { 
  RagBus, 
  RagEventEnvelope, 
  AgentMCPClient,
  WorkflowResult 
} from '@cortex-os/rag-contracts';
```

## Architecture Decision

Created as part of circular dependency resolution to break the agents ↔ rag cycle.

See: `/Users/jamiecraik/.Cortex-OS/CIRCULAR_DEP_FIX_REQUIRED.md`
