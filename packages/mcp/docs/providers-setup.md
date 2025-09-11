# Providers Setup

Many features integrate external services.

## Databases
Set `MCP_DB_URL` for PostgreSQL, MySQL, or SQLite.

## Redis
Required for the task queue:
```bash
export MCP_REDIS_URL=redis://localhost:6379/0
```

## Vector Storage
Configure `QDRANT_URL` to enable semantic memory with Qdrant.
