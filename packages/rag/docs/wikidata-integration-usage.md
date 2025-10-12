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
import { executeWikidataWorkflow, routeFactQuery } from '@cortex-os/rag/integrations/remote-mcp';
import { createAgentMCPClient } from '@cortex-os/rag/stubs/agent-mcp-client';

// Initialize MCP client
const mcpClient = createAgentMCPClient({
  endpoint: 'http://localhost:3029/mcp',
  timeout: 30000,
});

// Route a fact-finding query
const routedQuery = await routeFactQuery(
  'Who invented the telephone?',
  { scope: 'facts', dimensions: 1024 }
);

// Execute complete Wikidata workflow
const results = await executeWikidataWorkflow(
  routedQuery,
  mcpClient,
  { timeout: 30000, maxResults: 5 }
);

console.log('[brAInwav] Wikidata Results:', results);
```

## 🔄 Workflow Components

### 1. Query Routing (`routeFactQuery`)

Routes queries to appropriate search scope with optimization hints:

```typescript
import { routeFactQuery } from '@cortex-os/rag/integrations/remote-mcp';

const routing = await routeFactQuery(
  'What are the properties of quantum entanglement?',
  {
    scope: 'facts',           // 'facts' | 'properties' | 'general'
    dimensions: 1024,         // Matryoshka embedding dimensions
    fallbackLocal: true      // Enable local store fallback
  }
);

// Returns: RouteResult with optimized parameters
```

### 2. Workflow Orchestration (`executeWikidataWorkflow`)

Complete vector → claims → SPARQL pipeline with metadata stitching:

```typescript
import { executeWikidataWorkflow } from '@cortex-os/rag/integrations/remote-mcp';

const workflow = await executeWikidataWorkflow(
  routedQuery,
  mcpClient,
  {
    timeout: 30000,
    maxResults: 10,
    enableSparql: true,       // Include SPARQL enrichment
    enableClaims: true        // Include claims retrieval
  }
);

// Returns: Complete results with provenance tracking
```

### 3. Testing Infrastructure (`AgentMCPClientStub`)

Comprehensive testing stub for development and testing:

```typescript
import { createAgentMCPClient } from '@cortex-os/rag/stubs/agent-mcp-client';

const stubClient = createAgentMCPClient({
  mockMode: true,
  trackCalls: true
});

// Configure mock responses
stubClient.mockResponse('wikidata.vector_search_items', [
  { qid: 'Q1234', title: 'Test Entity', score: 0.95 }
]);

// Track call history
const history = stubClient.getCallHistory();
```

## 🏗️ Architecture Integration

### MCP Tool Integration

The integration provides these MCP tools:

| Tool Name | Purpose | Input | Output |
|-----------|---------|-------|--------|
| `wikidata.vector_search_items` | Vector similarity search | Query, dimensions | Ranked entities |
| `wikidata.get_claims` | Retrieve entity claims | QID, properties | Structured claims |
| `wikidata.sparql_query` | Execute SPARQL queries | Query string | Result bindings |
| `wikidata.search_facts` | Combined fact search | Query, scope | Enriched results |

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
    vector_search: 15000,
    claims_retrieval: 10000,
    sparql_query: 20000
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

try {
  const results = await executeWikidataWorkflow(query, client, options);
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
const safeResults = await executeWikidataWorkflow(query, client, {
  fallbackLocal: true,
  gracefulDegradation: true
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
const results = await executeWikidataWorkflow(query, client, options);
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
const factsQuery = await routeFactQuery(query, { scope: 'facts' });
const propsQuery = await routeFactQuery(query, { scope: 'properties' });
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
  queries.map(q => executeWikidataWorkflow(q, client, options))
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