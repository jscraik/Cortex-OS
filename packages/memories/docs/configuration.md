# Configuration

Configuration is environment-driven. Set variables in `.env` or your process environment.

## Memory Stores
- `MEMORIES_SHORT_STORE` and `MEMORIES_LONG_STORE` select `memory`, `sqlite`, `prisma`, or `local`.
- `MEMORIES_SQLITE_PATH` defines the SQLite file location.

## Embedders
- `MEMORIES_EMBEDDER` chooses `mlx`, `ollama`, or `noop`.
- MLX: configure `MLX_MODEL` and `MLX_EMBED_BASE_URL`.
- Ollama: set `OLLAMA_BASE_URL` and `OLLAMA_MODEL`.

## Policies
Namespace rules live in `readiness.yml` or can be supplied programmatically. Each policy supports TTL, size limits, and optional PII redaction.
