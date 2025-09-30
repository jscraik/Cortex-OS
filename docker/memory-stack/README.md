# Cortex-OS Memory Stack Docker Deployment

## Overview

This directory contains the Docker Compose configuration for deploying the Cortex-OS Memory Stack, a unified memory architecture providing multiple access patterns for AI agents and applications.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Clients                                  │
├──────────┬──────────┬──────────┬──────────┬───────────────┤
│ Claude   │ ChatGPT  │ VS Code  │ Editors  │ Others        │
│ Desktop  │          │          │          │               │
└─────┬────┴─────┬────┴─────┬─────┬─────┬─────┬───────┘
      │          │          │     │     │     │
      │ STDIO    │ HTTP/    │ HTTP/│     │     │
      │ (stdio)  │ stream   │ stream│     │     │
      │          │ (sse)    │ (poll)│     │     │
┌─────▼─────┐  ┌─▼───────────────────────▼─────┐ ┌───▼───┐
│ cortex-   │  │          cortex-mcp         │ │Tools  │
│ os (app)  │  │        (MCP Server)         │ │mount  │
└───────────┘  └─────┬────────────────────┬────┘ └───────┘
                      │                    │
                ┌─────▼─────┐        ┌─────▼─────┐
                │ rest-api  │        │ agent-    │
                │ (gateway) │        │ toolkit   │
                └───────────┘        └───────────┘
                      │                    │
                      └────────┬───────────┘
                               │
                    ┌──────────▼──────────┐
                    │     local-memory    │
                    │   (memory-core)     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    Storage Layer    │
                    │  SQLite + Qdrant    │
                    └─────────────────────┘
```

### Core Services

- **Qdrant**: Vector database for semantic search
- **SQLite**: Primary storage for memories (source of truth)
- **cortex-mcp**: Central MCP server with dual transport (STDIO + HTTP/streamable)
- **rest-api**: OpenAPI/Express wrapper for web applications
- **local-memory**: Core memory service with business logic
- **Agent-Toolkit**: Tools bind-mount for local tool integration

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Docker memory available (minimum 2GB recommended)
- Port availability: 3028, 3029, 6333, 6334, 9600, 9610

### Development Deployment

```bash
# Clone repository
git clone https://github.com/brainwav/cortex-os.git
cd cortex-os

# Navigate to docker directory
cd docker/memory-stack

# Copy environment file
cp .env.example .env

# Start services
docker-compose up -d

# Check service health
make health-check

# View logs
docker-compose logs -f
```

## Services

### Core Services

#### 1. cortex-mcp
**Port:** 9600 (HTTP), 9610 (STDIO)
**Purpose:** Central MCP server providing memory operations via multiple transports
**Health:** `/healthz`, `/readyz`

Features:
- Dual transport support (STDIO and HTTP/streamable)
- Delegates all operations to memory-core
- A2A event emission for observability
- Thin adapter pattern (no business logic)

#### 2. rest-api
**Port:** 3028
**Purpose:** RESTful API gateway for memory operations
**Health:** `/api/v1/health`

Features:
- Express.js server with OpenAPI documentation
- CORS support for web applications
- Request/response validation with Zod schemas
- Rate limiting and authentication hooks

#### 3. local-memory
**Port:** 3029 (internal)
**Purpose:** Core memory service containing all business logic
**Health:** `/healthz`, `/readyz`

Features:
- SQLite for canonical data storage
- Qdrant for vector indexing and semantic search
- FTS5 keyword search
- Token budget enforcement (40K cap, 20K trim)

### Data Services

#### 4. SQLite (Database)
**Volume:** `./data/sqlite:/data`
**Purpose:** Canonical storage for all memory data
**Backup:** Automated snapshots to `./data/backups`

#### 5. Qdrant (Vector Store)
**Port:** 6333 (HTTP), 6334 (gRPC)
**Purpose:** Vector indexing for semantic search
**Volume:** `./data/qdrant:/qdrant/storage`
**Collection:** `local_memory_v1`

### Environment Configuration

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Key environment variables:

```bash
# Memory Configuration
MEMORY_DB_PATH=/data/unified-memories.db
MEMORY_DEFAULT_LIMIT=10
MEMORY_MAX_LIMIT=100
MEMORY_DEFAULT_THRESHOLD=0.5
MEMORY_HYBRID_WEIGHT=0.6
EMBED_DIM=384

# Token Budgets
MEMORY_TOKEN_CAP=40000
MEMORY_TOKEN_TRIM=20000

# Qdrant Configuration
QDRANT_URL=http://qdrant:6333
QDRANT_COLLECTION=local_memory_v1
SIMILARITY=Cosine

# Logging
MEMORY_LOG_LEVEL=info
LOG_FORMAT=json

# API Configuration
API_PORT=3028
API_HOST=0.0.0.0
CORS_ORIGIN=*
```

## Client Access Patterns

### 1. Claude Desktop (STDIO)
Configure in Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cortex-memory": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "cortex-mcp",
        "node",
        "/app/dist/index.js",
        "--transport",
        "stdio"
      ]
    }
  }
}
```

### 2. Web Applications (HTTP/streamable)

```javascript
// SSE streaming
const eventSource = new EventSource(
  'http://localhost:9600/mcp/stream'
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Memory operation:', data);
};

// REST API call
const response = await fetch('http://localhost:3028/api/v1/memory/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-api-key'
  },
  body: JSON.stringify({
    query: 'semantic search query',
    limit: 10,
    threshold: 0.5
  })
});
```

### 3. Python Applications

```python
import requests

# REST API access
response = requests.post(
  'http://localhost:3028/api/v1/memory/store',
  json={
    'text': 'Memory content to store',
    'tags': ['important', 'reference'],
    'metadata': {'source': 'python-app'}
  },
  headers={'Authorization': 'Bearer your-api-key'}
)

# Direct MCP via subprocess (advanced)
import subprocess
import json

result = subprocess.run(
  ['docker', 'exec', '-i', 'cortex-mcp', 'node', '/app/dist/index.js', '--transport', 'stdio'],
  input=json.dumps({
    'jsonrpc': '2.0',
    'id': 1,
    'method': 'tools/call',
    'params': {
      'name': 'memory.search',
      'arguments': {'query': 'search terms'}
    }
  }),
  capture_output=True,
  text=True
)
```

## Agent-Toolkit Integration

### Tool Path Resolution

The system resolves agent-toolkit tools with the following priority order:

1. `$AGENT_TOOLKIT_TOOLS_DIR` (explicit override)
2. `$CORTEX_HOME/tools/agent-toolkit`
3. `$HOME/.Cortex-OS/tools/agent-toolkit` ← **primary path**
4. Repo fallback: `packages/agent-toolkit/tools`

### Docker Bind Mount

The Docker Compose configuration includes a bind mount for agent-toolkit tools:

```yaml
volumes:
  - ~/.Cortex-OS/tools/agent-toolkit:/tools/agent-toolkit:ro
```

This enables:
- Local tool installation at `$HOME/.Cortex-OS/tools/agent-toolkit`
- Tool path resolution prioritizing local installation
- First-class agent-toolkit support via MCP

### Available Tools

The MCP hub exposes these agent-toolkit tools as `agent_toolkit_*`:

- **agent_toolkit_search** - Multi-tool search (ripgrep + semgrep + ast-grep)
- **agent_toolkit_multi** - Parallel search across multiple tools
- **agent_toolkit_codemod** - Structural modifications via Comby
- **agent_toolkit_validate** - Project validation based on file types

### MCP Hub Architecture

```
External Clients
│
├─ MCP Clients (STDIO): Claude Desktop, local IDEs
├─ MCP Clients (HTTP/Streamable): ChatGPT, remote IDEs
└─ REST Clients: Editors / scripts / services

────────────────────────────────────────────────────────────
                  Entry Points (Dual Mode)
────────────────────────────────────────────────────────────
   ┌─────────────────────────────────────────────────────┐
   │ MCP Hub                                             │
   │  • stdio adapter (local)                            │
   │  • httpStream adapter (remote)                      │
   │  • tools exposed:                                   │
   │     - memory.store/search/analysis/relationships…   │
   │     - agent_toolkit_search/multi/codemod/validate…  │
   │  • A2A events emitted                               │
   └───────────┬─────────────────────────────┬───────────┘
               │                             │
        ┌──────▼──────┐                 ┌────▼───────┐
        │ REST API    │                 │ CLI runners │
        │ (OpenAPI)   │                 │ (optional)  │
        └──────┬──────┘                 └────────────┘
               │
────────────────────────────────────────────────────────────
                      Services Layer (Core)
────────────────────────────────────────────────────────────
   ┌─────────────────────────────────────────────────────┐
   │ Memory‑Core API (LocalMemoryProvider)               │
   │  • policy/tags/domains                              │
   │  • hybrid retrieval (ANN + BM25)                    │
   │  • embeddings gen (local)                           │
   │  • governance & quotas (optional)                   │
   └───────────┬───────────────────────────┬────────────┘
               │                           │
         ┌─────▼─────┐                ┌────▼─────┐
         │  SQLite   │                │  Qdrant  │
         │  canonical│                │  ANN     │
         │  FTS5     │                │  filters │
         └───────────┘                └──────────┘
```

## Operations

### Health Checks

```bash
# Check all services
make health-check

# Individual service checks
curl http://localhost:9600/healthz  # cortex-mcp
curl http://localhost:3028/api/v1/health  # rest-api
curl http://localhost:3029/healthz  # local-memory
curl http://localhost:6333/health  # qdrant
```

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f cortex-mcp
docker-compose logs -f rest-api
docker-compose logs -f local-memory

# Last 100 lines
docker-compose logs --tail=100
```

### Data Management

```bash
# Backup SQLite database
docker-compose exec local-memory \
  cp /data/unified-memories.db /data/backups/backup-$(date +%Y%m%d-%H%M%S).db

# Access SQLite directly
docker-compose exec local-memory \
  sqlite3 /data/unified-memories.db

# Access Qdrant
curl http://localhost:6333/collections/local_memory_v1
```

### Scaling

```bash
# Scale REST API
docker-compose up -d --scale rest-api=3

# Scale MCP servers (different ports)
docker-compose -f docker-compose.scale.yml up -d
```

## Monitoring

### Metrics

The stack exposes metrics at `/metrics` on each service:

- `cortex_mcp_operations_total` - MCP operation count by type
- `cortex_memory_operations_duration_seconds` - Operation latency
- `cortex_token_usage_bytes` - Token budget tracking
- `cortex_circuit_breaker_state` - Circuit breaker status

### Observability

All operations emit A2A events:

```json
{
  "specversion": "1.0",
  "type": "brainwav.memory.stored",
  "source": "cortex-mcp",
  "id": "uuid",
  "time": "2024-01-01T00:00:00Z",
  "data": {
    "operation": "store",
    "memoryId": "uuid",
    "tokens": 150,
    "duration": 25
  }
}
```

## Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   # Check what's using ports
   lsof -i :3028 -i :3029 -i :6333 -i :9600

   # Change ports in .env
   API_PORT=3028
   MCP_PORT=9600
   QDRANT_HTTP_PORT=6333
   ```

2. **Memory exhaustion**
   ```bash
   # Check container memory usage
   docker stats

   # Increase memory limits
   docker-compose up -d --memory=4g
   ```

3. **Database corruption**
   ```bash
   # Check SQLite integrity
   docker-compose exec local-memory \
     sqlite3 /data/unified-memories.db "PRAGMA integrity_check;"

   # Restore from backup
   docker-compose exec local-memory \
     cp /data/backups/latest.db /data/unified-memories.db
   ```

### Debug Mode

Enable debug logging:

```bash
# Set log level
echo "MEMORY_LOG_LEVEL=debug" >> .env

# Restart services
docker-compose restart
```

### Performance Tuning

1. **Increase SQLite cache size**
   ```bash
   echo "SQLITE_CACHE_SIZE=20000" >> .env
   ```

2. **Optimize Qdrant**
   ```bash
   echo "QDRANT_SEARCH_BATCH_SIZE=100" >> .env
   echo "QDRANT_WAL_ENABLED_MB=512" >> .env
   ```

3. **Enable connection pooling**
   ```bash
   echo "MEMORY_POOL_SIZE=20" >> .env
   ```

## Production Deployment

### Security Considerations

1. **Enable authentication**
   ```bash
   echo "API_KEY_REQUIRED=true" >> .env
   echo "API_KEY=your-secure-api-key" >> .env
   ```

2. **Use HTTPS**
   ```bash
   # Configure reverse proxy (nginx/traefik)
   # See nginx.conf.example
   ```

3. **Network isolation**
   ```bash
   # Use Docker networks
   docker network create cortex-memory
   docker-compose up -d --network cortex-memory
   ```

### Backup Strategy

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="./data/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# SQLite backup
docker-compose exec -T local-memory \
  sqlite3 /data/unified-memories.db ".backup /tmp/backup.db"

# Copy to host
docker cp $(docker-compose ps -q local-memory):/tmp/backup.db \
  "$BACKUP_DIR/sqlite-$TIMESTAMP.db"

# Qdrant snapshot
docker-compose exec -T qdrant \
  curl -X POST http://localhost:6333/collections/local_memory_v1/snapshots

# Cleanup old backups (keep 7 days)
find "$BACKUP_DIR" -name "*.db" -mtime +7 -delete
```

## Contributing

When making changes to the Docker configuration:

1. Update `docker-compose.yml` for development
2. Update `docker-compose.prod.yml` for production
3. Update this README with new services or configuration
4. Test with `make test` before committing
5. Update version numbers in `.env` if needed

## License

Copyright (c) 2024 brAInwav Technologies. All rights reserved.

