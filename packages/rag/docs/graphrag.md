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

# GPU Acceleration Configuration
GPU_ACCELERATION_ENABLED=true          # Enable GPU acceleration
GPU_DEVICE_IDS=0                        # Comma-separated GPU device IDs
GPU_MAX_MEMORY_MB=8192                   # Maximum VRAM per GPU (MB)
GPU_BATCH_SIZE=32                         # Batch size for GPU processing
GPU_MAX_CONCURRENT_BATCHES=3             # Max concurrent batches
GPU_TIMEOUT_MS=30000                     # GPU operation timeout
GPU_CPU_BATCH_SIZE=16                     # CPU fallback batch size
GPU_MAX_QUEUE_SIZE=100                    # Max queued requests
GPU_METRICS_INTERVAL=30000               # Metrics collection interval
GPU_PERFORMANCE_THRESHOLD=5000           # Performance threshold (ms)
GPU_MEMORY_THRESHOLD=80                   # Memory usage threshold (%)
GPU_BATCH_TIMEOUT=1000                    # Batch timeout (ms)
```

### GPU Acceleration Configuration

#### CUDA-based Embedding Generation

The GraphRAG system supports GPU acceleration for embedding generation using CUDA-enabled devices:

```typescript
const graphragService = createGraphRAGService({
  gpuAcceleration: {
    enabled: true,
    cuda: {
      enabled: true,
      deviceIds: [0],           // GPU devices to use
      maxMemoryUsage: 8192,      // 8GB VRAM limit
      batchSize: 32,             // Batch size for GPU processing
      maxConcurrentBatches: 3,  // Concurrent batches
      timeout: 30000,           // Operation timeout
    },
    fallback: {
      toCPU: true,              # Fallback to CPU if GPU fails
      cpuBatchSize: 16,
      maxQueueSize: 100,
    },
    monitoring: {
      enabled: true,
      metricsInterval: 30000,   # 30 seconds
      performanceThreshold: 5000, # 5 seconds
      memoryThreshold: 80,     # 80% memory usage
    },
    optimization: {
      autoBatching: true,       # Automatic batch optimization
      batchTimeout: 1000,       # 1 second batch timeout
      memoryOptimization: true,
      preferGPUForBatches: true,
    },
  },
});
```

#### GPU Performance Benefits

- **Throughput**: Up to 10x faster embedding generation
- **Latency**: Reduced per-request latency for batch operations
- **Efficiency**: Optimized GPU memory utilization
- **Scalability**: Support for concurrent GPU operations

#### GPU Health Monitoring

```typescript
// Check GPU health and metrics
const health = await graphragService.healthCheck();
console.log('GPU Status:', health.gpu);
// Output: {
//   enabled: true,
//   healthy: true,
//   deviceCount: 1,
//   metrics: {
//     totalRequests: 1250,
//     gpuRequests: 980,
//     cpuRequests: 270,
//     averageLatency: 45,
//     gpuUtilization: 78,
//     fallbackRate: 0.22
//   }
// }
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

#### 1. Multi-Level Caching System
The GraphRAG system implements intelligent caching at multiple levels:

```typescript
// Qdrant Query Caching (5-minute TTL)
const config = {
  qdrant: {
    cache: {
      enabled: true,
      ttl: 300000,        // 5 minutes
      maxSize: 1000,      // Max cached queries
    },
  },
};

// Context Assembly Caching (10-minute TTL)
// Automatically caches assembled context chunks
// Reduces database query overhead by up to 90%

// Graph Expansion Caching (5-minute TTL)
// Caches neighbor expansion results
// Optimizes repeated graph traversals

// External Citation Caching (30-minute TTL)
// Caches arXiv and external provider results
// Reduces external API calls significantly
```

#### 2. Parallel Processing Optimization
```typescript
// Embedding Generation (Parallel)
const [denseVector, sparseVector] = await Promise.all([
  embedDenseFunc(query),
  embedSparseFunc(query),
]);

// Database Queries (Parallel)
const [nodes, chunkRefs] = await Promise.all([
  prisma.graphNode.findMany({ where: { id: { in: nodeIds } } }),
  prisma.chunkRef.findMany({ where: { nodeId: { in: nodeIds } } }),
]);
```

#### 3. Database Query Optimization
```typescript
// Selective Field Loading
prisma.chunkRef.findMany({
  select: {
    id: true,
    nodeId: true,
    qdrantId: true,
    path: true,
    // Only load required fields
  },
  take: maxChunks * 2,  // Reduced from 3 for performance
});

// Optimized Graph Traversal
const edges = await prisma.graphEdge.findMany({
  where: {
    type: { in: allowedEdges },
    OR: [{ srcId: { in: nodeIds } }, { dstId: { in: nodeIds } }],
  },
  take: Math.min(maxNeighborsPerNode * nodeIds.length, 1000), // Performance cap
});
```

#### 4. Hybrid Search Tuning
```typescript
// Optimized Query Structure with Timeout Protection
const queryRequest = {
  query: {
    must: [
      {
        vector: {
          name: 'dense',
          vector: denseVector,
          limit: params.k,
        },
      },
      // Conditional sparse vector inclusion
      ...(sparseVector.indices.length > 0 ? [{
        sparse_vector: {
          name: 'sparse',
          indices: sparseVector.indices,
          values: sparseVector.values,
          limit: params.k,
        },
      }] : []),
    ],
  },
  with_payload: {
    include: ['node_id', 'chunk_content', 'path'], // Selective payload
  },
  timeout: 15000, // Circuit breaker protection
};
```

#### 5. External Provider Optimization
```typescript
// Intelligent Timeout and Result Capping
const result = await Promise.race([
  mcpClient.callTool(settings.tool, {
    query,
    max_results: Math.min(maxResults, 10), // Cap for performance
  }),
  createTimeoutPromise(Math.min(timeoutMs, 15000)), // Cap timeout
]);
```

### Performance Monitoring

#### Real-time Metrics
```typescript
import { performanceMonitor } from '@cortex-os/memory-core';

// Get comprehensive performance metrics
const metrics = performanceMonitor.getMetrics();
console.log('Performance metrics:', {
  queryCount: metrics.queryCount,
  averageLatency: metrics.averageQueryTime,
  cacheHitRatio: metrics.cacheHitRatio,
  memoryUsageMB: metrics.memoryUsageMB,
  externalProviderStats: metrics.externalProviderStats,
});

// Get operation-specific statistics
const operationStats = performanceMonitor.getOperationStats();
console.log('Operation stats:', operationStats);
// Output: {
//   hybrid_search: { count: 150, averageDuration: 234, successRate: 0.98 },
//   context_assembly: { count: 150, averageDuration: 45, successRate: 1.0 },
//   graph_expansion: { count: 150, averageDuration: 89, successRate: 1.0 }
// }
```

#### Health Check with Performance
```typescript
const health = await graphragService.healthCheck();
console.log('System health:', health);
// Output: {
//   status: 'healthy' | 'degraded' | 'unhealthy',
//   components: { qdrant: true, prisma: true },
//   performance: {
//     averageLatency: 245,
//     cacheHitRatio: 0.67,
//     memoryUsageMB: 156,
//     issues: []
//   }
// }
```

#### Performance Recommendations
```typescript
const summary = performanceMonitor.getPerformanceSummary();
console.log('Performance recommendations:', summary);
// Output: {
//   status: 'healthy',
//   issues: [],
//   recommendations: []
// }
```

### Benchmarking

#### Running Performance Benchmarks
```bash
# Run comprehensive performance tests
npx tsx scripts/performance/benchmark-graphrag.ts

# Results are exported to benchmark-results.json
# Includes latency percentiles, throughput, and cache performance
```

#### Benchmark Results Example
```json
{
  "timestamp": "2025-01-10T12:00:00.000Z",
  "results": {
    "totalQueries": 75,
    "averageLatency": 234.5,
    "p50Latency": 198,
    "p95Latency": 456,
    "p99Latency": 789,
    "throughputQPS": 12.3,
    "cacheHitRatio": 0.67,
    "memoryUsageMB": 156,
    "errors": 0
  },
  "cacheResults": {
    "cacheEnabledLatency": 198,
    "cacheDisabledLatency": 567,
    "speedupRatio": 2.86
  }
}
```

### Performance Optimization Checklist

#### ✅ Implemented Optimizations
- **Multi-level caching** with intelligent TTL management
- **Parallel processing** for embeddings and database queries
- **Selective field loading** to reduce data transfer
- **Query result capping** for performance protection
- **Timeout and circuit breaker** patterns
- **Performance monitoring** with real-time metrics
- **Memory usage tracking** and cleanup

#### 🎯 Performance Targets
- **Average query latency**: < 500ms
- **P95 latency**: < 1000ms
- **Cache hit ratio**: > 60%
- **Memory usage**: < 500MB
- **Throughput**: > 10 QPS
- **Error rate**: < 1%

#### 📊 Monitoring KPIs
- Query latency percentiles (P50, P95, P99)
- Cache hit/miss ratios
- Memory usage trends
- External provider latency
- Error rates by operation
- Concurrent query capacity

### Troubleshooting Performance Issues

#### High Latency Issues
1. **Check cache hit ratio** - Low ratio indicates cache configuration issues
2. **Monitor memory usage** - High memory may cause GC pressure
3. **Review external provider performance** - MCP timeouts can slow queries
4. **Examine database query patterns** - Inefficient queries need optimization

#### Memory Issues
1. **Cache size management** - Reduce cache TTL or size
2. **Result capping** - Limit query result sizes
3. **Regular cleanup** - Implement cache cleanup routines
4. **Monitoring** - Set up memory usage alerts

#### Cache Performance
1. **TTL optimization** - Balance cache freshness vs hit ratio
2. **Cache key strategy** - Ensure proper cache key generation
3. **Cache warming** - Pre-populate cache with common queries
4. **Eviction policy** - Monitor cache eviction patterns

### Production Deployment Considerations

#### Resource Allocation
```typescript
const productionConfig = {
  limits: {
    maxConcurrentQueries: 10,  // Based on available resources
    queryTimeoutMs: 15000,     // Shorter timeout for production
    maxContextChunks: 20,      // Conservative limit
  },
  expansion: {
    maxNeighborsPerNode: 15,   // Reduced for performance
    maxHops: 1,                // Single-hop for speed
  },
};
```

#### Monitoring Setup
```typescript
// Set up regular performance reporting
setInterval(() => {
  const metrics = performanceMonitor.getMetrics();
  const summary = performanceMonitor.getPerformanceSummary();

  // Send to monitoring system
  sendMetrics(metrics);

  // Check for performance issues
  if (summary.status !== 'healthy') {
    sendAlert(summary.issues);
  }
}, 60000); // Every minute
```

#### Load Balancing
- Deploy multiple GraphRAG instances behind a load balancer
- Use connection pooling for database connections
- Implement external provider rate limiting
- Set up health checks with automatic failover

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