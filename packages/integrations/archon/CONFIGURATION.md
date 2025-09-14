# Cortex-OS Archon Integration Configuration

## Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# Archon Server Configuration
ARCHON_SERVER_URL=http://localhost:3001
ARCHON_API_KEY=your-api-key-here
ARCHON_TIMEOUT=30000

# Feature Toggles
ARCHON_ENABLE_AGENTS=true
ARCHON_ENABLE_ORCHESTRATION=true
ARCHON_ENABLE_RAG=true
ARCHON_ENABLE_DOCUMENT_SYNC=true

# Health Monitoring
ARCHON_HEALTH_CHECK_INTERVAL=60000
ARCHON_AUTO_CONNECT=true

# RAG Configuration
ARCHON_FALLBACK_TO_LOCAL=true
ARCHON_REMOTE_SEARCH_LIMIT=20
ARCHON_HYBRID_SEARCH_LOCAL_WEIGHT=0.7
ARCHON_HYBRID_SEARCH_REMOTE_WEIGHT=0.3

# Task Management
ARCHON_TASK_SYNC_INTERVAL=30000

# Retry Configuration
ARCHON_MAX_RETRIES=3
ARCHON_BACKOFF_MS=1000
```

## Configuration Factory

Use the configuration factory to create config from environment variables:

```typescript
import { createArchonConfigFromEnv } from '@cortex-os/archon-integration';

const config = createArchonConfigFromEnv();
```

## Custom Configuration

```typescript
import type { CortexArchonConfig } from '@cortex-os/archon-integration';

const config: CortexArchonConfig = {
  // Connection settings
  serverUrl: process.env.ARCHON_SERVER_URL || 'http://localhost:3001',
  apiKey: process.env.ARCHON_API_KEY,
  timeout: 30000,

  // Feature toggles
  enableAgentIntegration: true,
  enableTaskOrchestration: true,
  enableRemoteRetrieval: true,
  enableDocumentSync: true,

  // Agent settings
  agentCapabilities: ['search', 'analyze', 'summarize'],

  // Task orchestration
  taskSyncInterval: 30000,

  // RAG settings
  fallbackToLocal: true,
  remoteSearchLimit: 20,
  hybridSearchWeights: {
    local: 0.7,
    remote: 0.3,
  },

  // Health monitoring
  healthCheckInterval: 60000,
  autoConnect: true,

  // Retry configuration
  retryConfig: {
    maxRetries: 3,
    backoffMs: 1000,
  },
};
```

## Docker Configuration

Example `docker-compose.yml` for development:

```yaml
version: '3.8'
services:
  archon:
    image: archon/server:latest
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - API_PORT=3001
    volumes:
      - archon_data:/app/data

  cortex-os:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ARCHON_SERVER_URL=http://archon:3001
      - ARCHON_ENABLE_AGENTS=true
      - ARCHON_ENABLE_ORCHESTRATION=true
      - ARCHON_ENABLE_RAG=true
    depends_on:
      - archon

volumes:
  archon_data:
```

## Production Configuration

For production deployments:

```typescript
const config: CortexArchonConfig = {
  serverUrl: 'https://archon.company.com',
  apiKey: process.env.ARCHON_API_KEY,
  timeout: 60000,

  // Enable all features
  enableAgentIntegration: true,
  enableTaskOrchestration: true,
  enableRemoteRetrieval: true,
  enableDocumentSync: true,

  // Production-ready health checks
  healthCheckInterval: 30000,
  autoConnect: true,

  // More aggressive retry policy
  retryConfig: {
    maxRetries: 5,
    backoffMs: 2000,
  },

  // Optimized RAG settings
  remoteSearchLimit: 50,
  hybridSearchWeights: {
    local: 0.6,
    remote: 0.4,
  },
};
```

## Configuration Validation

The configuration is validated using Zod schemas:

```typescript
import { z } from 'zod';

const CortexArchonConfigSchema = z.object({
  serverUrl: z.string().url(),
  apiKey: z.string().optional(),
  timeout: z.number().positive().optional(),
  enableAgentIntegration: z.boolean().optional(),
  enableTaskOrchestration: z.boolean().optional(),
  enableRemoteRetrieval: z.boolean().optional(),
  enableDocumentSync: z.boolean().optional(),
  healthCheckInterval: z.number().positive().optional(),
  retryConfig: z.object({
    maxRetries: z.number().min(1),
    backoffMs: z.number().positive(),
  }).optional(),
});

// Validate configuration
const validatedConfig = CortexArchonConfigSchema.parse(config);
```
