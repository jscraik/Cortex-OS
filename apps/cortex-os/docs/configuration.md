# Configuration

Configuration is driven entirely by environment variables:

## Storage
- `MEMORIES_SHORT_STORE` – `memory | sqlite | prisma | local`
- `MEMORIES_LONG_STORE` – `memory | sqlite | prisma | local`
- `MEMORIES_SQLITE_PATH` – path to SQLite DB
- `LOCAL_MEMORY_BASE_URL`, `LOCAL_MEMORY_API_KEY`, `LOCAL_MEMORY_NAMESPACE`

## Encryption
- `MEMORIES_ENCRYPTION_SECRET`
- `MEMORIES_ENCRYPTION_NAMESPACES`
- `MEMORIES_ENCRYPTION_REGEX`
- `MEMORIES_ENCRYPT_VECTORS`, `MEMORIES_ENCRYPT_TAGS`

## Embedder
- `MEMORIES_EMBEDDER` – `noop | mlx | ollama`
- MLX: `MLX_MODEL`, `MLX_SERVICE_URL`, `MLX_MODELS_DIR`, `PYTHON_EXEC`, `PYTHONPATH`
- Ollama: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`

## Decay
- `MEMORIES_DECAY_ENABLED`
- `MEMORIES_DECAY_HALFLIFE_MS`
