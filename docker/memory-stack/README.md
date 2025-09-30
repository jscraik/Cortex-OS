# Cortex Memory Stack

Docker Compose setup for the Cortex Memory system with SQLite + Qdrant backend.

## Architecture

- **Qdrant**: Vector database for semantic search
- **SQLite**: Primary storage for memories (source of truth)
- **MCP Server**: Dual transport (STDIO + HTTP/streamable)
- **REST API**: OpenAPI/Express wrapper
- **Nginx**: Reverse proxy (production only)

## Quick Start

1. Copy environment file:
```bash
cp .env.example .env
```

2. Start the stack:
```bash
# Development mode
docker-compose up -d

# With embedding service
docker-compose --profile embeddings up -d

# Production mode
docker-compose -f docker-compose.yml -f docker-compose.override.yml --profile production up -d
```

## Services

### Qdrant
- **URL**: http://localhost:6333
- **Docs**: http://localhost:6333/dashboard
- **Collection**: `local_memory_v1`

### MCP Server
- **HTTP**: http://localhost:9600
- **Health**: http://localhost:9600/healthz
- **STDIO**: Use via Claude Desktop or other MCP clients

### REST API
- **URL**: http://localhost:9700
- **API Docs**: http://localhost:9700/api-docs
- **OpenAPI Spec**: http://localhost:9700/openapi.json
- **Health**: http://localhost:9700/healthz

## Configuration

Environment variables in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `QDRANT_API_KEY` | - | Qdrant API key (optional) |
| `CORS_ORIGIN` | `*` | CORS origin for REST API |
| `ENABLE_SWAGGER` | `true` | Enable Swagger UI |
| `MEMORY_LOG_LEVEL` | `info` | Log level for memory provider |
| `RATE_LIMIT_MAX` | `1000` | Max requests per 15min window |

## Development

### Build local images:
```bash
docker-compose build
```

### View logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f cortex-mcp
```

### Run tests:
```bash
# From repository root
pnpm test

# Test specific package
cd packages/memory-core && pnpm test
```

## Usage Examples

### Store a memory via REST API:
```bash
curl -X POST http://localhost:9700/api/v1/memory/store \
  -H "Content-Type: application/json" \
  -d '{
    "content": "The meeting discussed quarterly results and upcoming product launches",
    "importance": 7,
    "tags": ["meeting", "business", "quarterly"],
    "domain": "work"
  }'
```

### Search memories:
```bash
curl -X POST http://localhost:9700/api/v1/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "quarterly business results",
    "search_type": "semantic",
    "limit": 5
  }'
```

### Use MCP with Claude Desktop:

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "cortex-memory": {
      "command": "docker",
      "args": [
        "exec", "-i", "cortex-mcp",
        "node", "dist/index.js",
        "--transport", "stdio"
      ]
    }
  }
}
```

## Health Checks

All services include health checks:

```bash
# Check stack health
curl http://localhost:9700/healthz

# Detailed health with Qdrant status
curl http://localhost:9700/api/v1/memory/stats \
  -H "Content-Type: application/json" \
  -d '{"include": ["qdrant_stats"]}'
```

## Monitoring

### Logs location:
- Service logs: `./logs/`
- Docker logs: `docker-compose logs`

### Metrics:
- Qdrant metrics: http://localhost:6333/metrics
- Memory stats: `/api/v1/memory/stats` endpoint

## Data Persistence

- **Qdrant data**: `qdrant_data` volume
- **SQLite database**: `memory_data` volume at `/data/unified-memories.db`

## Backup

### Backup SQLite:
```bash
docker exec cortex-mcp cp /data/unified-memories.db backup-$(date +%Y%m%d).db
```

### Export Qdrant:
```bash
curl -X POST http://localhost:6333/collections/local_memory_v1/snapshots \
  -H "Content-Type: application/json"
```

## Troubleshooting

### Qdrant connection issues:
```bash
docker exec qdrant curl -fSs http://localhost:6333/collections
```

### Check SQLite integrity:
```bash
docker exec cortex-mcp sqlite3 /data/unified-memories.db "PRAGMA integrity_check;"
```

### View memory stats:
```bash
curl http://localhost:9700/api/v1/memory/stats
```

## Production Considerations

1. Set `ENABLE_SWAGGER=false`
2. Configure specific `CORS_ORIGIN`
3. Use HTTPS with nginx proxy
4. Set up proper logging (ELK stack)
5. Configure monitoring (Prometheus)
6. Set up backup cron jobs
7. Use resource limits in docker-compose.yml

## Scaling

- **Read scaling**: Multiple REST API instances behind load balancer
- **Write scaling**: Single SQLite instance (consider Postgres for multi-write)
- **Vector scaling**: Qdrant cluster mode
- **Embedding scaling**: Dedicated embedding service (Ollama cluster)