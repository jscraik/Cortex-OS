# Wikidata Semantic Layer - Usage Guide

**Package**: `@cortex-os/rag`  
**Status**: ✅ **PRODUCTION READY**  
**Integration**: MCP + A2A Events  
**Last Updated**: 2025-01-12

## 🎯 Overview

The Wikidata Semantic Layer provides production-ready semantic search and knowledge enrichment capabilities for brAInwav Cortex-OS agents. It orchestrates multi-step workflows combining vector search, claims retrieval, and SPARQL queries with complete provenance tracking.

## 🚀 Quick Start

### Installation

```bash
# The Wikidata integration is included in the RAG package
pnpm add @cortex-os/rag

# For MCP integration
pnpm add @cortex-os/mcp @cortex-os/a2a-contracts
```

### Basic Usage

```typescript
import type { ConnectorEntry } from '@cortex-os/protocol';
import { executeWikidataWorkflow, routeFactQuery } from '@cortex-os/rag/integrations/remote-mcp';
import { createAgentMCPClient } from '@cortex-os/rag/integrations/agents-shim';
// TODO: Update the path below to point to your connectors.manifest.json location
import connectorsManifest from './path/to/connectors.manifest.json' assert { type: 'json' };

// Resolve the Wikidata connector from the manifest
const wikidataConnector = connectorsManifest.connectors.find(
  (entry: ConnectorEntry) => entry.id === 'wikidata'
);

if (!wikidataConnector) {
  throw new Error('Wikidata connector missing from manifest');
}

// Initialize MCP client
const mcpClient = createAgentMCPClient({
  endpoint: 'http://localhost:3029/mcp',
  timeout: 30000,
});

// Route a fact-finding query
const routing = await routeFactQuery(
  'Who invented the telephone?',
  wikidataConnector,
  {
    scope: 'facts',
    matryoshkaDimension: 768,
    embedderHint: 'jina-embeddings-v3',
  }
);

// Execute complete Wikidata workflow
const results = await executeWikidataWorkflow(
  'Who invented the telephone?',
  wikidataConnector,
  {
    mcpClient,
    timeout: 30000,
    enableSparql: true,
  }
);

console.log('[brAInwav] Routing decision:', routing);
console.log('[brAInwav] Wikidata results:', results);
```

## 🔄 Workflow Components

### 1. Query Routing (`routeFactQuery`)

Routes queries to appropriate search scope with optimization hints:

```typescript
import { routeFactQuery } from '@cortex-os/rag/integrations/remote-mcp';
import connectorsManifest from '../../../config/connectors.manifest.json' assert { type: 'json' };

const wikidataConnector = connectorsManifest.connectors.find(
  (entry) => entry.id === 'wikidata'
);

if (!wikidataConnector) throw new Error('Wikidata connector missing');

const routing = await routeFactQuery(
  'What are the properties of quantum entanglement?',
  wikidataConnector,
  {
    scope: 'properties',
    matryoshkaDimension: 768,
    embedderHint: 'jina-embeddings-v3',
  }
);

// Returns: RouteResult with optimized parameters
```

### 2. Workflow Orchestration (`executeWikidataWorkflow`)

Complete vector → claims → SPARQL pipeline with metadata stitching:

```typescript
import { executeWikidataWorkflow } from '@cortex-os/rag/integrations/remote-mcp';
import { createAgentMCPClient } from '@cortex-os/rag/integrations/agents-shim';
import connectorsManifest from '../../../config/connectors.manifest.json' assert { type: 'json' };

const wikidataConnector = connectorsManifest.connectors.find(
  (entry) => entry.id === 'wikidata'
);

if (!wikidataConnector) throw new Error('Wikidata connector missing');

const mcpClient = createAgentMCPClient({
  endpoint: 'http://localhost:3029/mcp',
  timeout: 30000,
});

const workflow = await executeWikidataWorkflow(
  'What are the properties of quantum entanglement?',
  wikidataConnector,
  {
    mcpClient,
    timeout: 30000,
    enableSparql: true,       // Include SPARQL enrichment
    enablePartialResults: true,
  }
);

// Returns: Complete results with provenance tracking
```

### 3. Testing Infrastructure (`AgentMCPClientStub`)

Comprehensive testing stub for development and testing:

```typescript
import { createAgentMCPClientStub } from '@cortex-os/rag/stubs/agent-mcp-client';

const stubClient = createAgentMCPClientStub();

// Configure mock responses using the canonical tool names
stubClient.mockCallTool('vector_search_items', {
  results: [
    { qid: 'Q1234', title: 'Test Entity', score: 0.95 },
  ],
});

stubClient.mockCallTool('get_claims', {
  claims: [
    { property: 'P31', value: 'Q898983', qualifiers: [] },
  ],
});

stubClient.mockCallTool('sparql', {
  results: [{ inventor: { type: 'uri', value: 'http://www.wikidata.org/entity/Q1234' } }],
});

// Track call history
const history = stubClient.getCallHistory();
```

## 🏗️ Architecture Integration

### MCP Tool Integration

The integration provides these MCP tools:

| Tool Name | Purpose | Input | Output |
|-----------|---------|-------|--------|
| `vector_search_items` | Vector similarity search over items | Query, matryoshkaDimension, scope | Ranked entities |
| `vector_search_properties` | Vector similarity search over properties | Query, matryoshkaDimension, scope | Ranked properties |
| `get_claims` | Retrieve entity claims | QID, brand | Structured claims |
| `sparql` | Execute SPARQL queries | Query string, brand | Result bindings |

### A2A Event Integration

Emit events for cross-feature coordination:

```typescript
import { createEnvelope } from '@cortex-os/a2a-contracts';

// Emit semantic search event
const searchEvent = createEnvelope('semantic.search.completed', {
  query: 'user query',
  results: wikidataResults,
  provenance: {
    source: 'wikidata',
    timestamp: new Date().toISOString(),
    brand: 'brAInwav'
  }
});
```

### Local Memory Integration

Store and retrieve semantic insights:

```typescript
import { createStoreFromEnv } from '@cortex-os/memories';

const memoryStore = createStoreFromEnv();

// Store semantic insights
await memoryStore.store({
  content: 'Wikidata semantic analysis results',
  metadata: {
    source: 'wikidata-integration',
    entities: results.map(r => r.qid),
    brand: 'brAInwav'
  },
  importance: 8,
  tags: ['semantic', 'wikidata', 'facts']
});
```

## 🧪 Testing

### Unit Tests

```bash
# Run wikidata integration tests
pnpm test packages/rag/src/integrations/remote-mcp.test.ts

# Run stub infrastructure tests  
pnpm test packages/rag/src/stubs/agent-mcp-client.test.ts

# Run routing tests
pnpm test packages/rag/src/integrations/agents-shim.test.ts
```

### Integration Tests

```bash
# Full workflow integration tests
pnpm test:integration packages/rag

# End-to-end MCP tests
pnpm test:e2e --grep "wikidata"
```

### Coverage Verification

```bash
# Generate coverage report
pnpm test:coverage packages/rag

# Expected: ≥95% coverage for wikidata integration
```

## 🔧 Configuration

### Environment Variables

```bash
# MCP Configuration
CORTEX_MCP_ENDPOINT=http://localhost:3029/mcp
CORTEX_MCP_TIMEOUT=30000

# Wikidata Service Configuration
WIKIDATA_VECTOR_ENDPOINT=http://localhost:8000/embed
WIKIDATA_SPARQL_ENDPOINT=https://query.wikidata.org/sparql

# Memory Integration
LOCAL_MEMORY_BASE_URL=http://localhost:3028
MEMORIES_SHORT_STORE=redis
MEMORIES_EMBEDDER=openai

# brAInwav Branding
BRAINWAV_BRAND_ENABLED=true
```

### Advanced Configuration

```typescript
// Advanced workflow configuration
const config = {
  // Timeout settings
  timeouts: {
    vector_search_items: 15000,
    get_claims: 10000,
    sparql: 20000
  },
  
  // Fallback behavior
  fallbacks: {
    enableLocalStore: true,
    maxRetries: 3,
    backoffMs: 1000
  },
  
  // Performance optimization
  optimization: {
    batchSize: 10,
    maxConcurrency: 5,
    cacheResults: true
  },
  
  // brAInwav branding
  branding: {
    enabled: true,
    includeInLogs: true,
    includeInResponses: true
  }
};
```

## 🚨 Error Handling

### Common Error Patterns

```typescript
import { WikidataIntegrationError } from '@cortex-os/rag/integrations/remote-mcp';
import { createAgentMCPClient } from '@cortex-os/rag/integrations/agents-shim';
import connectorsManifest from '../../../config/connectors.manifest.json' assert { type: 'json' };

const wikidataConnector = connectorsManifest.connectors.find(
  (entry) => entry.id === 'wikidata'
);

if (!wikidataConnector) throw new Error('Wikidata connector missing');

const mcpClient = createAgentMCPClient({ endpoint: 'http://localhost:3029/mcp' });
const workflowOptions = { timeout: 30000, enableSparql: true };

try {
  const results = await executeWikidataWorkflow(query, wikidataConnector, {
    ...workflowOptions,
    mcpClient,
  });
} catch (error) {
  if (error instanceof WikidataIntegrationError) {
    // Handle specific wikidata errors
    console.error('[brAInwav] Wikidata error:', error.message);
    
    // Use fallback if available
    if (error.fallbackResults) {
      return error.fallbackResults;
    }
  }
  
  // Handle network errors
  if (error.code === 'NETWORK_ERROR') {
    // Implement retry logic or local fallback
  }
}
```

### Graceful Degradation

```typescript
// Enable graceful fallback to local store
import { createAgentMCPClient } from '@cortex-os/rag/integrations/agents-shim';

const mcpClient = createAgentMCPClient({ endpoint: 'http://localhost:3029/mcp' });
const localStore = createLocalVectorStore();

const safeResults = await executeWikidataWorkflow(query, wikidataConnector, {
  mcpClient,
  enablePartialResults: true,
  localStore,
});

// Check result source
if (safeResults.source === 'local_fallback') {
  console.warn('[brAInwav] Using local fallback due to network issues');
}
```

## 📊 Monitoring & Observability

### Health Checks

```typescript
// Check wikidata integration health
const health = await mcpClient.callTool('health_check', {
  component: 'wikidata_integration'
});

console.log('[brAInwav] Health status:', health);
```

### Performance Metrics

```typescript
// Track workflow performance
const startTime = Date.now();
const results = await executeWikidataWorkflow(query, wikidataConnector, {
  ...options,
  mcpClient,
});
const duration = Date.now() - startTime;

// Log performance metrics
console.log(`[brAInwav] Workflow completed in ${duration}ms`);
console.log(`[brAInwav] Retrieved ${results.length} results`);
```

### Debugging

```bash
# Enable debug logging
DEBUG=cortex:rag:wikidata pnpm start

# View detailed workflow logs
tail -f logs/wikidata-integration.log
```

## 🔗 Related Documentation

- **Package README**: `packages/rag/README.md`
- **Technical Specification**: `tasks/wikidata-semantic-layer-integration/feature-spec.md`
- **Implementation Guide**: `tasks/wikidata-semantic-layer-integration/implementation-checklist.md`
- **Test Documentation**: `packages/rag/src/__tests__/README.md`
- **MCP Integration**: `packages/mcp/README.md`
- **A2A Events**: `libs/typescript/contracts/README.md`

## 🎯 Best Practices

### 1. Query Optimization

```typescript
// Use appropriate scope for better routing
import connectorsManifest from '../../../config/connectors.manifest.json' assert { type: 'json' };

const wikidataConnector = connectorsManifest.connectors.find(
  (entry) => entry.id === 'wikidata'
);

if (!wikidataConnector) throw new Error('Wikidata connector missing');

const factsRouting = await routeFactQuery(query, wikidataConnector, { scope: 'facts' });
const propsRouting = await routeFactQuery(query, wikidataConnector, { scope: 'properties' });
```

### 2. Error Resilience

```typescript
// Always enable fallback mechanisms
const options = {
  fallbackLocal: true,
  maxRetries: 3,
  gracefulDegradation: true
};
```

### 3. Performance Optimization

```typescript
// Use batch processing for multiple queries
const batchResults = await Promise.allSettled(
  queries.map((q) =>
    executeWikidataWorkflow(q, wikidataConnector, {
      ...options,
      mcpClient,
    })
  )
);
```

### 4. brAInwav Compliance

```typescript
// Always include brAInwav branding in responses
const response = {
  results: wikidataResults,
  metadata: {
    brand: 'brAInwav',
    source: 'wikidata-semantic-layer',
    timestamp: new Date().toISOString()
  }
};
```

---

**Status**: ✅ **PRODUCTION READY**  
**Quality Gate**: ✅ **GO**  
**Deployment**: Ready for immediate production use

**Maintained by**: brAInwav Development Team  
**Support**: [brAInwav Documentation](https://docs.brainwav.ai)

Co-authored-by: brAInwav Development Team <dev@brainwav.ai>