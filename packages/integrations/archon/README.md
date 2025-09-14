# @cortex-os/archon-integration

Cortex-OS integration with Archon's knowledge base and task management system via the Model Context Protocol (MCP).

## Overview

This package provides a unified service that coordinates Archon integration across all Cortex-OS packages:

- **Agents**: MCP client integration for agent-Archon communication
- **Orchestration**: Async task management with Archon sync
- **RAG**: Remote retrieval and document ingestion via Archon's knowledge base

## Features

- **Unified Service**: Single point of integration for all Archon functionality
- **Event-Driven**: Real-time updates on tasks, documents, and knowledge searches
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Configurable**: Flexible configuration for different deployment scenarios
- **Health Monitoring**: Built-in health checks and error handling
- **Fallback Support**: Graceful degradation when Archon is unavailable

## Quick Start

```typescript
import { createCortexArchonService } from '@cortex-os/archon-integration';

const service = createCortexArchonService({
  serverUrl: 'http://localhost:3001',
  enableAgentIntegration: true,
  enableTaskOrchestration: true,
  enableRemoteRetrieval: true,
  enableDocumentSync: true,
});

await service.initialize();

// Create an agent
const agent = await service.createAgent({
  name: 'Knowledge Assistant',
  description: 'Helps with knowledge base queries',
  capabilities: ['search', 'summarize'],
});

// Search knowledge base
const results = await service.searchKnowledge('machine learning concepts');

// Create a task
const task = await service.createTask(
  'Process new documents',
  'Ingest 50 technical documents into knowledge base',
  { priority: 'high' }
);
```

## Configuration

### Basic Configuration

```typescript
interface CortexArchonConfig {
  // Connection settings
  serverUrl: string;
  apiKey?: string;
  timeout?: number;

  // Feature toggles
  enableAgentIntegration?: boolean;
  enableTaskOrchestration?: boolean;
  enableRemoteRetrieval?: boolean;
  enableDocumentSync?: boolean;

  // Health monitoring
  healthCheckInterval?: number;
  autoConnect?: boolean;

  // Retry configuration
  retryConfig?: {
    maxRetries: number;
    backoffMs: number;
  };
}
```

### Advanced Configuration

```typescript
const config: CortexArchonConfig = {
  serverUrl: 'http://localhost:3001',
  apiKey: process.env.ARCHON_API_KEY,
  
  // Enable all features
  enableAgentIntegration: true,
  enableTaskOrchestration: true,
  enableRemoteRetrieval: true,
  enableDocumentSync: true,
  
  // RAG-specific settings
  fallbackToLocal: true,
  remoteSearchLimit: 20,
  hybridSearchWeights: {
    local: 0.7,
    remote: 0.3,
  },
  
  // Health monitoring
  healthCheckInterval: 60000, // 1 minute
  autoConnect: true,
  
  // Retry settings
  retryConfig: {
    maxRetries: 3,
    backoffMs: 1000,
  },
};
```

## Events

The service emits events for real-time updates:

```typescript
service.on('connected', () => {
  console.log('Connected to Archon');
});

service.on('task-created', (task) => {
  console.log('New task created:', task.title);
});

service.on('document-synced', (result) => {
  console.log('Document synced:', result.documentId);
});

service.on('knowledge-search', (query, results) => {
  console.log(`Search for "${query}" returned ${results.length} results`);
});

service.on('error', (error) => {
  console.error('Archon integration error:', error);
});
```

## Methods

### Agent Management

```typescript
// Create an agent
const agent = await service.createAgent({
  name: 'Research Assistant',
  description: 'Specializes in academic research',
  capabilities: ['search', 'analyze', 'summarize'],
});
```

### Task Management

```typescript
// Create a task
const task = await service.createTask(
  'Analyze Market Report',
  'Extract key insights from Q3 market analysis',
  {
    priority: 'high',
    tags: ['analysis', 'market'],
    dueDate: '2024-12-31',
  }
);

// Update task status
await service.updateTaskStatus(task.taskId, 'completed', 'Analysis complete');
```

### Knowledge Base

```typescript
// Search knowledge base
const results = await service.searchKnowledge('artificial intelligence', {
  limit: 10,
  filters: {
    tags: ['tech', 'ai'],
    dateRange: {
      start: '2024-01-01',
      end: '2024-12-31',
    },
  },
});

// Upload document
const syncResult = await service.uploadDocument(
  documentContent,
  'research-paper.pdf',
  {
    tags: ['research', 'ai'],
    metadata: { author: 'Dr. Smith', year: 2024 },
  }
);
```

### Document Ingestion

```typescript
// Create bulk ingestion job
const job = await service.createIngestionJob(
  'Q4 Documentation Update',
  documents,
  {
    priority: 'medium',
    tags: ['q4', 'docs'],
    batchSize: 20,
  }
);
```

### RAG Integration

```typescript
// Set up enhanced embedder
const embedder = service.setupEmbedder(fallbackEmbedder);
await embedder.initialize();

// Set up enhanced store
const enhancedStore = service.setupEnhancedStore(localStore);
await enhancedStore.initialize();

// Query with hybrid search
const results = await enhancedStore.query(embedding, {
  topK: 10,
  useArchonKnowledge: true,
  hybridSearch: true,
});
```

## Health Monitoring

```typescript
// Get service status
const status = await service.getStatus();
console.log('Service status:', status);

// Health check events
service.on('health-check', (status) => {
  if (!status.healthy) {
    console.warn('Archon service unhealthy:', status.errors);
  }
});
```

## Error Handling

The service provides comprehensive error handling with fallback strategies:

```typescript
try {
  const results = await service.searchKnowledge('query');
} catch (error) {
  if (error.code === 'ARCHON_UNAVAILABLE') {
    // Fallback to local search
    console.warn('Archon unavailable, using local search');
  }
}
```

## Dependencies

- `@cortex-os/agents` - Agent and MCP client integration
- `@cortex-os/orchestration` - Task management and orchestration
- `@cortex-os/rag` - RAG components and document processing

## Development

```bash
# Build the package
pnpm build

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Development mode
pnpm dev
```

## Architecture

This package follows the Cortex-OS architecture principles:

- **Contract-first**: Zod schemas ensure type safety
- **Event-driven**: A2A integration ready
- **MCP compatible**: Tool exposure for agent consumption
- **Layered design**: Clean domain/app/infra separation

## License

MIT
