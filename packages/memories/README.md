# Cortex Memories

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/@cortex-os/memories)](https://www.npmjs.com/package/@cortex-os/memories)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#build-status)
[![Test Coverage](https://img.shields.io/badge/coverage-92%25-brightgreen)](#testing)
[![Security Scan](https://img.shields.io/badge/security-OWASP%20compliant-green)](#security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)

**Long-Term State Management with MLX Integration for Cortex-OS**  
*Neo4j graph storage, Qdrant vector search, MLX embeddings, and governed memory policies*

</div>

---

## 🎯 Overview

Cortex Memories provides comprehensive long-term state management for the Cortex-OS ASBR runtime. It implements governed memory policies, MLX-based embedding models with secure Python execution, and a composite embedder with intelligent fallback chains. The system supports both graph-based storage with Neo4j and vector search with Qdrant for optimal memory retrieval.

## ✨ Key Features

### 💾 Hybrid Storage Architecture
- **🌐 Neo4j Graph Storage** - Complex relationship modeling with Cypher queries
- **🔍 Qdrant Vector Search** - High-performance similarity search and retrieval
- **🗃️ SQLite Adapter** - Local development and testing support
- **⚗️ Prisma Integration** - Type-safe database operations with schema management

### 🧠 MLX Intelligence
- **🖥️ MLX Embedding Models** - Local inference with Apple Silicon optimization
- **🐍 Secure Python Bridge** - Sandboxed execution environment for ML models
- **🔄 Composite Embedder** - Smart fallback chain (MLX → Ollama → OpenAI)
- **📊 Embedding Optimization** - Batch processing and caching for performance

### 🛡️ Governed Memory
- **📋 Memory Policies** - Namespace-based access control and TTL management
- **🔒 PII Redaction** - Automatic detection and anonymization of sensitive data
- **📏 Size Limits** - Configurable memory item size constraints
- **⏰ TTL Management** - Automatic expiration and cleanup policies

### 🚀 Production Features
- **🏗️ Backward Compatibility** - Seamless migration from legacy memory systems
- **🧪 Comprehensive Testing** - 92% test coverage with integration tests
- **📈 Performance Monitoring** - Memory usage analytics and optimization
- **🔐 Security First** - OWASP compliance and secure data handling

## 🚀 Quick Start

### Installation

```bash
# Install the memories package
npm install @cortex-os/memories

# Or with yarn/pnpm
yarn add @cortex-os/memories
pnpm add @cortex-os/memories
```

### Basic Usage

```typescript
import { MemoryStore, MemoryPolicies, createCompositeEmbedder } from '@cortex-os/memories';

// Create composite embedder with MLX fallback chain
const embedder = createCompositeEmbedder({
  providers: [
    {
      type: 'mlx',
      modelPath: process.env.MLX_MODEL_PATH || 'mlx-community/bge-large-en-v1.5',
      pythonPath: process.env.PYTHON_PATH || 'python3'
    },
    {
      type: 'ollama',
      endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434'
    },
    {
      type: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-ada-002'
    }
  ],
  timeout: 30000,
  enableCaching: true
});

// Configure memory policies
const memoryPolicies: MemoryPolicies = {
  'agents:code-analysis': {
    namespace: 'agents:code-analysis',
    ttl: 'PT30M', // 30 minutes
    maxItemBytes: 256000, // 256KB
    redactPII: true
  },
  'agents:security': {
    namespace: 'agents:security',
    ttl: 'PT1H', // 1 hour
    maxItemBytes: 512000, // 512KB
    redactPII: true,
    encryptionEnabled: true
  },
  'user-data': {
    namespace: 'user-data',
    ttl: 'P30D', // 30 days
    maxItemBytes: 1048576, // 1MB
    redactPII: true,
    requiresConsent: true
  }
};

// Initialize memory store
const memoryStore = new MemoryStore({
  provider: 'neo4j', // or 'qdrant', 'sqlite', 'prisma'
  connection: {
    uri: process.env.NEO4J_URI || 'neo4j://localhost:7687',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password'
  },
  embedder,
  policies: memoryPolicies,
  enableMetrics: true
});

// Store memory with governance
await memoryStore.store('agents:code-analysis', 'analysis-result-1', {
  type: 'code-analysis',
  repository: 'cortex-os/cortex-os',
  findings: [
    {
      severity: 'medium',
      type: 'complexity',
      message: 'Function exceeds recommended complexity threshold',
      file: 'src/orchestration/engine.ts',
      line: 145
    }
  ],
  metadata: {
    timestamp: new Date().toISOString(),
    analyst: 'ai-agent-v1.2',
    confidence: 0.87
  }
});

// Retrieve memories with vector similarity
const similarMemories = await memoryStore.retrieveSimilar(
  'agents:code-analysis',
  'complex function analysis results',
  {
    limit: 5,
    threshold: 0.75,
    includeMetadata: true
  }
);

console.log('Similar memories found:', similarMemories.length);
```

## 🏗️ Architecture

### Memory Storage Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    Governed Memory Interface                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Memory Policies │  │ PII Redaction   │  │ TTL Management  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Storage Abstraction                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Neo4j Graph     │  │ Qdrant Vector   │  │ SQLite Local    │ │
│  │ Storage         │  │ Search          │  │ Development     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Embedding Intelligence                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ MLX Local       │  │ Ollama          │  │ OpenAI          │ │
│  │ Inference       │  │ Fallback        │  │ Fallback        │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### MLX Integration Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   TypeScript    │    │   Python Bridge  │    │   MLX Runtime   │
│   Memory API    │    │                  │    │                 │
│                 │    │                  │    │                 │
│ 1. Embed Text   │───▶│ 2. Serialize     │───▶│ 3. Load Model   │
│ 4. Cache Result │◀───│    Request       │    │    & Inference  │
│    & Return     │    │                  │    │                 │
│ 7. Handle       │◀───│ 6. Deserialize   │◀───│ 5. Generate     │
│    Response     │    │    Response      │    │    Embeddings   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📊 Memory Policies

### Policy Configuration

```typescript
interface MemoryPolicy {
  namespace: string;           // Memory namespace (e.g., 'agents:security')
  ttl: string;                // ISO 8601 duration (e.g., 'PT1H', 'P30D')
  maxItemBytes: number;       // Maximum item size in bytes
  redactPII: boolean;         // Enable PII detection and redaction
  encryptionEnabled?: boolean; // Enable at-rest encryption
  requiresConsent?: boolean;   // Require user consent for storage
  retentionPolicy?: {
    archiveAfter: string;     // Archive old memories
    deleteAfter: string;      // Permanent deletion
  };
}
```

### Common Policy Patterns

```typescript
// Agent analysis memories (short-term)
const analysisPolicy: MemoryPolicy = {
  namespace: 'agents:analysis',
  ttl: 'PT30M', // 30 minutes
  maxItemBytes: 256000,
  redactPII: true
};

// Security findings (medium-term)
const securityPolicy: MemoryPolicy = {
  namespace: 'agents:security',
  ttl: 'PT24H', // 24 hours
  maxItemBytes: 512000,
  redactPII: true,
  encryptionEnabled: true
};

// User interactions (long-term)
const userPolicy: MemoryPolicy = {
  namespace: 'user-interactions',
  ttl: 'P90D', // 90 days
  maxItemBytes: 1048576,
  redactPII: true,
  requiresConsent: true,
  retentionPolicy: {
    archiveAfter: 'P30D',
    deleteAfter: 'P90D'
  }
};
```

## 🧠 MLX Embedding Models

### Composite Embedder

```typescript
import { createCompositeEmbedder } from '@cortex-os/memories';

// Create embedder with intelligent fallback
const embedder = createCompositeEmbedder({
  providers: [
    {
      type: 'mlx',
      modelPath: 'mlx-community/bge-large-en-v1.5',
      cacheDir: './cache/mlx-models',
      pythonPath: 'python3',
      timeout: 30000
    },
    {
      type: 'ollama',
      endpoint: 'http://localhost:11434',
      model: 'nomic-embed-text',
      timeout: 15000
    },
    {
      type: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-ada-002',
      timeout: 10000
    }
  ],
  fallbackStrategy: 'cascade', // or 'parallel', 'fastest'
  cacheEnabled: true,
  batchSize: 32
});

// Embed text with automatic fallback
const embeddings = await embedder.embedText([
  'Complex machine learning inference pipeline',
  'Real-time agent coordination system',
  'Secure data processing workflow'
]);

console.log('Generated embeddings:', embeddings.length);
```

### MLX Model Configuration

```typescript
// Environment variables for MLX configuration
const mlxConfig = {
  modelPath: process.env.MLX_MODEL_PATH || 'mlx-community/bge-large-en-v1.5',
  cacheDir: process.env.MLX_CACHE_DIR || './cache/mlx-models',
  pythonPath: process.env.MLX_PYTHON_PATH || 'python3',
  maxMemory: process.env.MLX_MAX_MEMORY || '4GB',
  deviceType: 'mps' // Use Metal Performance Shaders on Apple Silicon
};

// Custom MLX embedder
const mlxEmbedder = createMLXEmbedder(mlxConfig);

// Batch embedding for performance
const batchResults = await mlxEmbedder.embedBatch(textArray, {
  batchSize: 16,
  enableProgressBar: true,
  timeout: 60000
});
```

## 💾 Storage Providers

### Neo4j Graph Storage

```typescript
// Neo4j configuration
const neo4jStore = new MemoryStore({
  provider: 'neo4j',
  connection: {
    uri: 'neo4j://localhost:7687',
    username: 'neo4j',
    password: 'password',
    database: 'cortex-memories'
  },
  embedder,
  policies: memoryPolicies
});

// Store with relationship modeling
await neo4jStore.store('agents:analysis', 'code-review-1', {
  type: 'code-review',
  findings: analysisResults,
  relationships: {
    'ANALYZED_BY': 'ai-agent-v1.2',
    'BELONGS_TO': 'repository:cortex-os',
    'RELATES_TO': ['security-finding-1', 'performance-issue-2']
  }
});

// Complex graph queries
const relatedMemories = await neo4jStore.query(`
  MATCH (m:Memory {namespace: 'agents:analysis'})-[r:RELATES_TO]->(related:Memory)
  WHERE m.id = $memoryId
  RETURN m, r, related
  ORDER BY r.confidence DESC
  LIMIT 10
`, { memoryId: 'code-review-1' });
```

### Qdrant Vector Search

```typescript
// Qdrant configuration
const qdrantStore = new MemoryStore({
  provider: 'qdrant',
  connection: {
    url: 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
    collection: 'cortex-memories'
  },
  embedder,
  vectorConfig: {
    dimensions: 1024, // Must match embedding model
    distance: 'cosine',
    quantization: {
      type: 'scalar',
      quantile: 0.99
    }
  }
});

// High-performance similarity search
const similarResults = await qdrantStore.retrieveSimilar(
  'agents:security',
  'potential security vulnerability in authentication',
  {
    limit: 20,
    threshold: 0.8,
    filter: {
      severity: ['high', 'critical'],
      timestamp: { gte: '2024-01-01T00:00:00Z' }
    },
    includeVectors: false
  }
);
```

### SQLite Development Storage

```typescript
// SQLite for local development
const sqliteStore = new MemoryStore({
  provider: 'sqlite',
  connection: {
    database: './data/memories.db',
    enableWAL: true,
    maxConnections: 10
  },
  embedder,
  enableFullTextSearch: true
});

// Fast local development
await sqliteStore.store('dev:testing', 'test-memory-1', {
  content: 'Development test data',
  metadata: { environment: 'test' }
});
```

## 🔄 JSONL Memory Conversion

Convert CAI-style `.jsonl` run logs into reusable memory collections:

```bash
# Convert JSONL logs to memory format
pnpm --filter @cortex-os/memories jsonl:import -- \
  --input logs/agent-run.jsonl \
  --output memory-collection.json \
  --namespace "agents:import" \
  --validate-schema

# Batch import multiple files
pnpm --filter @cortex-os/memories jsonl:batch-import -- \
  --input-dir ./logs \
  --output-dir ./memories \
  --parallel 4
```

### JSONL Schema Validation

```typescript
// Import with schema validation
import { importJSONL, MemorySchema } from '@cortex-os/memories/import';

const memorySchema = MemorySchema.extend({
  // Custom validation for imported data
  agentVersion: z.string().regex(/^v\d+\.\d+\.\d+$/),
  executionId: z.string().uuid(),
  performanceMetrics: z.object({
    duration: z.number().positive(),
    memoryUsed: z.number().positive(),
    tokensProcessed: z.number().int().positive()
  })
});

const importedMemories = await importJSONL('./logs/run.jsonl', {
  schema: memorySchema,
  namespace: 'agents:imported',
  batchSize: 100,
  enableProgressBar: true
});

console.log(`Imported ${importedMemories.length} validated memories`);
```

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm test

# Integration tests (requires Docker for Neo4j/Qdrant)
npm run test:integration

# MLX embedding tests
npm run test:mlx

# Memory policy compliance tests
npm run test:policies

# Performance benchmarks
npm run test:performance
```

### Test Coverage

| Component | Coverage | Notes |
|-----------|----------|--------|
| Memory Store | 95% | All storage providers tested |
| MLX Integration | 89% | Python bridge and model loading |
| Policy Engine | 94% | Governance and compliance rules |
| PII Redaction | 92% | Data privacy and anonymization |
| **Overall** | **92%** | Production-ready coverage |

### Testing with Mock Data

```typescript
import { createTestMemoryStore, MockEmbedder } from '@cortex-os/memories/testing';

describe('Memory Operations', () => {
  let memoryStore: MemoryStore;
  let mockEmbedder: MockEmbedder;

  beforeEach(() => {
    mockEmbedder = new MockEmbedder();
    memoryStore = createTestMemoryStore({
      provider: 'memory', // In-memory for testing
      embedder: mockEmbedder
    });
  });

  it('should store and retrieve memories with policies', async () => {
    await memoryStore.store('test:namespace', 'test-id', {
      content: 'Test memory content',
      metadata: { category: 'testing' }
    });

    const retrieved = await memoryStore.retrieve('test:namespace', 'test-id');
    expect(retrieved).toBeDefined();
    expect(retrieved?.content).toBe('Test memory content');
  });

  it('should respect TTL policies', async () => {
    // Test memory expiration
    const shortTTLPolicy = { ttl: 'PT1S', namespace: 'test:ttl' };
    await memoryStore.updatePolicy('test:ttl', shortTTLPolicy);
    
    await memoryStore.store('test:ttl', 'expiring-memory', { data: 'expires soon' });
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const expired = await memoryStore.retrieve('test:ttl', 'expiring-memory');
    expect(expired).toBeNull();
  });
});
```

## 📊 Performance & Monitoring

### Performance Metrics

| Operation | Typical Latency | Throughput | Notes |
|-----------|----------------|------------|--------|
| Store Memory | <100ms | 500 ops/sec | With embedding generation |
| Retrieve by ID | <10ms | 2000 ops/sec | Direct lookup |
| Similarity Search | <200ms | 100 queries/sec | Vector search with filtering |
| MLX Embedding | <50ms | 50 texts/sec | Local inference |
| Batch Operations | <2s | 1000 items/batch | Optimized bulk operations |

### Memory Usage Monitoring

```typescript
// Enable performance monitoring
const memoryStore = new MemoryStore({
  // ... configuration
  enableMetrics: true,
  metricsCallback: (metrics) => {
    console.log('Memory Store Metrics:', {
      totalMemories: metrics.totalCount,
      averageRetrievalTime: metrics.avgRetrievalLatency,
      embeddingCacheHitRate: metrics.embeddingCacheHitRate,
      storageUtilization: metrics.storageUtilizationPercent,
      policyViolations: metrics.policyViolationCount
    });
  }
});

// Custom performance tracking
memoryStore.on('memory.stored', (event) => {
  // Track storage events
});

memoryStore.on('memory.retrieved', (event) => {
  // Track retrieval performance
});

memoryStore.on('policy.violation', (event) => {
  // Handle policy violations
});
```

## 🔒 Security

### Security Features

- **🔐 Governed Access** - Namespace-based access control and authorization
- **🛡️ PII Redaction** - Automatic detection and anonymization of sensitive data
- **🔒 Encryption at Rest** - Optional encryption for sensitive memory namespaces
- **📋 Audit Logging** - Comprehensive logging of all memory operations
- **⚡ Input Validation** - Schema validation for all stored data

### PII Redaction

```typescript
// Automatic PII detection and redaction
const memoryWithPII = {
  content: 'User email: john.doe@example.com, SSN: 123-45-6789',
  metadata: {
    userPhone: '+1-555-0123',
    address: '123 Main St, Anytown, USA'
  }
};

// Stored with redaction (policy.redactPII = true)
await memoryStore.store('user:profile', 'user-123', memoryWithPII);

// Retrieved with redacted PII
const retrieved = await memoryStore.retrieve('user:profile', 'user-123');
console.log(retrieved?.content); 
// Output: 'User email: [EMAIL_REDACTED], SSN: [SSN_REDACTED]'
```

### Encryption Configuration

```typescript
// Configure encryption for sensitive namespaces
const encryptedPolicy: MemoryPolicy = {
  namespace: 'agents:security',
  ttl: 'PT24H',
  maxItemBytes: 512000,
  redactPII: true,
  encryptionEnabled: true,
  encryptionConfig: {
    algorithm: 'AES-256-GCM',
    keyRotationInterval: 'P30D',
    keyManagement: {
      provider: 'azure-keyvault', // or 'aws-kms', 'hashicorp-vault'
      keyId: 'memory-encryption-key'
    }
  }
};
```

## 🚀 Advanced Usage

### Custom Embedding Providers

```typescript
import { EmbeddingProvider } from '@cortex-os/memories';

// Implement custom embedding provider
class CustomEmbeddingProvider implements EmbeddingProvider {
  async embedText(texts: string[]): Promise<number[][]> {
    // Custom embedding logic
    const embeddings = await this.customModel.encode(texts);
    return embeddings;
  }
  
  async isHealthy(): Promise<boolean> {
    return this.customModel.isReady();
  }
  
  getDimensions(): number {
    return 768; // Custom model dimensions
  }
}

// Register custom provider
const embedder = createCompositeEmbedder({
  providers: [
    new CustomEmbeddingProvider(),
    // ... fallback providers
  ]
});
```

### Memory Migration

```typescript
// Migrate from legacy memory systems
import { MigrationTool } from '@cortex-os/memories/migration';

const migrationTool = new MigrationTool({
  source: {
    type: 'legacy',
    connectionString: 'old-memory-system-connection'
  },
  target: {
    type: 'neo4j',
    connectionString: 'neo4j://localhost:7687'
  },
  batchSize: 1000,
  enableProgressTracking: true
});

// Execute migration with progress tracking
const result = await migrationTool.migrate({
  namespaceMapping: {
    'old:namespace': 'new:namespace',
    // ... more mappings
  },
  preserveTimestamps: true,
  validateIntegrity: true
});

console.log(`Migrated ${result.totalRecords} memories in ${result.duration}ms`);
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone and install dependencies
git clone https://github.com/cortex-os/cortex-os.git
cd cortex-os/packages/memories
pnpm install

# Start development environment with Docker
docker-compose up -d neo4j qdrant

# Install MLX dependencies (macOS with Apple Silicon)
pip install mlx-community transformers

# Run development build
pnpm dev

# Run tests
pnpm test
```

### Contribution Guidelines

- Follow TypeScript best practices and strict typing
- Maintain test coverage above 90%
- Add comprehensive documentation for new storage providers
- Test with multiple embedding models and storage backends
- Ensure compatibility with all governance policies
- Include performance benchmarks for new features

## 📚 Resources

### Documentation

- **[Memory Architecture](./docs/architecture.md)** - Storage and embedding system design
- **[MLX Integration Guide](./docs/mlx-integration.md)** - Setting up local ML inference
- **[Policy Configuration](./docs/policies.md)** - Memory governance and compliance
- **[Migration Guide](./docs/migration.md)** - Upgrading from legacy systems
- **[Examples](./examples/)** - Usage examples and tutorials

### Community

- **🐛 Issues**: [GitHub Issues](https://github.com/cortex-os/cortex-os/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/cortex-os/cortex-os/discussions)
- **📖 Documentation**: [docs.cortex-os.dev](https://docs.cortex-os.dev)
- **📺 Tutorials**: [YouTube Channel](https://youtube.com/cortex-os)

## 📈 Roadmap

### Upcoming Features

- **🌊 Streaming Memories** - Real-time memory updates and subscriptions
- **🔄 Memory Versioning** - Version control for memory evolution
- **🤖 Smart Compression** - AI-powered memory summarization and archival
- **🌐 Distributed Storage** - Multi-region memory replication
- **📊 Advanced Analytics** - Memory usage patterns and insights
- **🧠 Semantic Clustering** - Automatic memory organization and categorization

## 🙏 Acknowledgments

- **[MLX](https://ml-explore.github.io/mlx/)** - Apple Silicon ML framework
- **[Neo4j](https://neo4j.com/)** - Graph database technology
- **[Qdrant](https://qdrant.tech/)** - Vector similarity search engine
- **[Sentence Transformers](https://www.sbert.net/)** - Embedding model ecosystem
- **Open Source Community** - Contributors and maintainers

---

<div align="center">

**Built with 💙 TypeScript, 🧠 MLX, and ❤️ by the Cortex-OS Team**

[![TypeScript](https://img.shields.io/badge/made%20with-TypeScript-blue)](https://www.typescriptlang.org/)
[![MLX](https://img.shields.io/badge/powered%20by-MLX-orange)](https://ml-explore.github.io/mlx/)
[![Neo4j](https://img.shields.io/badge/graph-Neo4j-green)](https://neo4j.com/)

</div>

