# GraphRAG: Graph-based Retrieval-Augmented Generation

## Overview

GraphRAG (Graph-based Retrieval-Augmented Generation) is a hybrid retrieval system that combines vector similarity search with graph traversal to provide rich, contextual knowledge retrieval for AI agents and language models.

## Architecture

The GraphRAG system consists of multiple coordinated components:

### Core Components

1. **Vector Search Layer** (Qdrant)
   - Dense embedding similarity search
   - Sparse keyword search (BM25)
   - Hybrid scoring algorithm

2. **Graph Layer** (Neo4j/Prisma)
   - Knowledge graph traversal
   - Relationship-based expansion
   - Context-aware path selection

3. **External Knowledge Integration** (MCP)
   - arXiv academic paper integration
   - Dynamic tool-based enrichment
   - Configurable provider selection

4. **Context Assembly**
   - Priority-based chunk selection
   - Citation generation
   - Response synthesis

## Configuration

### Basic Configuration

```typescript
import { createGraphRAGService } from '@cortex-os/memory-core';

const graphragService = createGraphRAGService({
  qdrant: {
    url: 'http://localhost:6333',
    collection: 'local_memory_v1',
    timeout: 30000,
  },
  expansion: {
    allowedEdges: [
      'IMPORTS',
      'DEPENDS_ON',
      'IMPLEMENTS_CONTRACT',
      'CALLS_TOOL',
      'EMITS_EVENT',
      'EXPOSES_PORT',
      'REFERENCES_DOC',
      'DECIDES_WITH',
    ],
    maxHops: 1,
    maxNeighborsPerNode: 20,
  },
  limits: {
    maxContextChunks: 24,
    queryTimeoutMs: 30000,
    maxConcurrentQueries: 5,
  },
});
```

### External Knowledge Provider Configuration

#### Neo4j Knowledge Graph

```typescript
const graphragService = createGraphRAGService({
  externalKg: {
    enabled: true,
    provider: 'neo4j',
    uri: 'bolt://localhost:7687',
    user: 'neo4j',
    password: 'your-password',
    maxDepth: 2,
    citationPrefix: 'neo4j',
  },
});
```

#### MCP arXiv Integration

```typescript
const graphragService = createGraphRAGService({
  externalKg: {
    enabled: true,
    provider: 'mcp',
    slug: 'arxiv-1',
    tool: 'search_papers',
    maxResults: 5,
    requestTimeoutMs: 10000,
    maxDepth: 1,
    citationPrefix: 'arxiv',
  },
});
```

### Environment Variables

```bash
# External Knowledge Graph Provider
EXTERNAL_KG_PROVIDER=mcp  # 'none' | 'neo4j' | 'mcp'

# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password

# arXiv MCP Configuration
ARXIV_MCP_SLUG=arxiv-1
ARXIV_MCP_SEARCH_TOOL=search_papers
ARXIV_MCP_MAX_RESULTS=5
ARXIV_MCP_REQUEST_TIMEOUT=10000

# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-api-key
QDRANT_COLLECTION=local_memory_v1
```

## Usage

### Basic Query

```typescript
// Initialize the service
await graphragService.initialize(
  embedDenseFunction,    // (text: string) => Promise<number[]>
  embedSparseFunction    // (text: string) => Promise<{indices: number[], values: number[]}>
);

// Perform a query
const result = await graphragService.query({
  question: 'What are the latest developments in transformer architectures?',
  k: 8,
  maxChunks: 24,
  includeCitations: true,
});

console.log('Answer:', result.answer);
console.log('Sources:', result.sources);
console.log('Citations:', result.citations);
console.log('Metadata:', result.metadata);
```

### Advanced Query with Filters

```typescript
const result = await graphragService.query({
  question: 'How does dependency injection work in modern frameworks?',
  k: 10,
  maxHops: 2,
  maxChunks: 30,
  threshold: 0.7,
  includeCitations: true,
  namespace: 'architecture',
  filters: {
    nodeTypes: ['CLASS', 'INTERFACE'],
    edgeTypes: ['IMPLEMENTS', 'DEPENDS_ON'],
  },
});
```

## arXiv Integration

### Overview

The GraphRAG system integrates with arXiv through MCP (Model Context Protocol) to provide academic paper citations and research context. This allows agents to:

- Search for relevant academic papers
- Include up-to-date research citations
- Access scholarly knowledge beyond the local corpus
- Provide authoritative sources for technical claims

### Setup Requirements

1. **Register arXiv MCP Server**
```bash
# Add arXiv server to MCP registry
npx @cortex-os/mcp-registry add arxiv-1
```

2. **Configure MCP Integration**
```typescript
// Create MCP provider configuration
const mcpConfig = {
  provider: 'mcp' as const,
  settings: {
    slug: 'arxiv-1',
    tool: 'search_papers',
    maxResults: 5,
    requestTimeoutMs: 10000,
  },
};
```

3. **Initialize with arXiv Support**
```typescript
const service = createGraphRAGService({
  externalKg: {
    enabled: true,
    provider: 'mcp',
    slug: 'arxiv-1',
    tool: 'search_papers',
    maxResults: 5,
    requestTimeoutMs: 10000,
  },
});
```

### arXiv Query Examples

```typescript
// Query that triggers arXiv search
const result = await service.query({
  question: 'What are the latest advances in large language models?',
  includeCitations: true,
});

// Result will include arXiv citations
console.log('arXiv citations:', result.citations?.filter(c => c.path.startsWith('arxiv:')));
```

### arXiv Citation Format

```typescript
interface ExternalCitation {
  path: string;           // e.g., "arxiv:2301.00001"
  title: string;          // Paper title
  content: string;        // Abstract/summary
  published: string;      // ISO-8601 date
  metadata: {
    provider: 'arxiv';
    source: {
      authors: string[];    // Paper authors
      categories: string[]; // arXiv categories
      doi?: string;         // DOI if available
    };
    confidence: number;    // Relevance score (0-1)
    url: string;          // arXiv URL
  };
}
```

## Performance Considerations

### Optimization Strategies

1. **Hybrid Search Tuning**
```typescript
// Adjust the balance between dense and sparse search
const config = {
  qdrant: {
    hybridSearch: {
      denseWeight: 0.7,    // Weight for semantic similarity
      sparseWeight: 0.3,   // Weight for keyword matching
    },
  },
};
```

2. **Graph Expansion Limits**
```typescript
// Control graph traversal depth and breadth
const config = {
  expansion: {
    maxHops: 1,                    // Limit traversal depth
    maxNeighborsPerNode: 20,       // Limit breadth
    allowedEdges: ['CALLS_TOOL'],   // Restrict edge types
  },
};
```

3. **Caching Strategies**
```typescript
// Enable result caching for repeated queries
const config = {
  caching: {
    enabled: true,
    ttl: 300000,        // 5 minutes
    maxSize: 1000,      // Max cached results
  },
};
```

### Monitoring and Metrics

```typescript
// Health check
const health = await graphragService.healthCheck();
console.log('System health:', health);

// Performance metrics
const stats = await graphragService.getStats();
console.log('Knowledge graph stats:', stats);
```

## Troubleshooting

### Common Issues

1. **MCP Provider Connection Failed**
```bash
# Check MCP server registration
npx @cortex-os/mcp-registry list

# Verify arXiv server availability
npx @cortex-os/mcp-registry test arxiv-1
```

2. **Low Citation Quality**
```typescript
// Adjust arXiv search parameters
const config = {
  externalKg: {
    maxResults: 10,        // Increase search results
    requestTimeoutMs: 15000, // Allow longer searches
  },
};
```

3. **Performance Issues**
```typescript
// Reduce computational complexity
const config = {
  limits: {
    maxContextChunks: 16,     // Reduce context size
    queryTimeoutMs: 15000,    // Shorter timeout
  },
  expansion: {
    maxHops: 1,               // Shallow graph traversal
    maxNeighborsPerNode: 10,  // Fewer neighbors
  },
};
```

### Debug Logging

```typescript
// Enable detailed logging
const config = {
  branding: {
    emitBrandedEvents: true,  // Enable event logging
  },
  logging: {
    level: 'debug',
    component: 'graphrag',
  },
};
```

## API Reference

### GraphRAGService

#### Methods

- `initialize(embedDenseFunc, embedSparseFunc)`: Initialize the service
- `query(params)`: Perform a knowledge retrieval query
- `healthCheck()`: Check system health
- `getStats()`: Get system statistics
- `close()`: Cleanup resources

#### Query Parameters

```typescript
interface GraphRAGQueryRequest {
  question: string;           // Required: Search query
  k?: number;                 // Optional: Initial results (default: 8)
  maxHops?: number;           // Optional: Graph traversal depth (default: 1)
  maxChunks?: number;         // Optional: Context chunks (default: 24)
  threshold?: number;         // Optional: Similarity threshold
  includeCitations?: boolean; // Optional: Include citations (default: true)
  namespace?: string;         // Optional: Search namespace
  filters?: Record<string, any>; // Optional: Search filters
}
```

#### Response Format

```typescript
interface GraphRAGResult {
  answer?: string;            // Generated answer
  sources: Array<{            // Source chunks
    id: string;
    nodeId: string;
    path: string;
    content: string;
    score: number;
  }>;
  graphContext: {
    focusNodes: number;
    expandedNodes: number;
    totalChunks: number;
    edgesTraversed: number;
  };
  metadata: {
    brainwavPowered: boolean;
    retrievalDurationMs: number;
    queryTimestamp: string;
    brainwavSource: string;
    externalKgEnriched?: boolean;
  };
  citations?: Array<{         // Generated citations
    path: string;
    lines?: string;
    nodeType: GraphNodeType;
    relevanceScore: number;
    brainwavIndexed: boolean;
  }>;
}
```

## Integration Examples

### With Agent Framework

```typescript
import { createToolLayerAgent } from '@cortex-os/agents';

// Create agent with arXiv research capability
const agent = createToolLayerAgent({
  name: 'research-agent',
  enableArxivResearch: true,
  arxivServerSlug: 'arxiv-1',
});

// Agent will automatically use arXiv for research queries
const response = await agent.execute(
  'Find recent papers about attention mechanisms in transformers'
);
```

### With LangGraph

```typescript
import { intelligenceAnalysisNode } from '@cortex-os/agents';

// Research queries will route to arXiv tools
const state = await intelligenceAnalysisNode({
  messages: [new HumanMessage('What are the latest GAN architectures?')],
  tools: ['arxiv_search', 'arxiv_download'],
});

// State will include selected arXiv tools
console.log('Selected tools:', state.context.selectedTools);
```

## Best Practices

1. **Query Formulation**
   - Use specific, well-formed questions
   - Include relevant technical terms
   - Specify time ranges for recent research

2. **Citation Usage**
   - Always verify citation accuracy
   - Use multiple sources for important claims
   - Check publication dates for temporal relevance

3. **Performance Optimization**
   - Set appropriate timeouts for external providers
   - Limit graph traversal depth for complex queries
   - Cache results when appropriate

4. **Error Handling**
   - Implement graceful degradation
   - Provide fallback responses
   - Log provider failures for monitoring

## Roadmap

### Upcoming Features

- **Multi-Provider Support**: Combine multiple external knowledge sources
- **Citation Ranking**: Advanced relevance scoring for citations
- **Real-time Updates**: Live arXiv feed integration
- **Visual Graph Explorer**: Interactive knowledge graph visualization
- **Custom Citation Formats**: Support for various citation styles

### Community Contributions

We welcome contributions to improve GraphRAG:

1. **Performance Optimizations**: Faster search and traversal algorithms
2. **New Providers**: Additional external knowledge integrations
3. **UI Components**: Visualization and exploration tools
4. **Documentation**: Guides, tutorials, and examples

See the [contributing guide](./contributing.md) for details.

## Additional Resources

- [TDD Plan](../../../tasks/arxiv-kg-tool-integration-tdd-plan.md)
- [API Reference](./api-reference.md)
- [Architecture Guide](./architecture.md)
- [Troubleshooting](./troubleshooting.md)
- [Security Guide](./security-guide.md)