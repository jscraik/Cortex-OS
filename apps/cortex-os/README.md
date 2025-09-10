# Cortex-OS App

This app wires the `@cortex-os/memories` service using env-driven factories for storage and embedders.

## Quick Env Reference

- Storage (layered short/long backends):
  - `MEMORIES_SHORT_STORE`: `memory | sqlite | prisma | local` (default: `memory`)
  - `MEMORIES_LONG_STORE`: `memory | sqlite | prisma | local` (default: `sqlite`)
  - `MEMORIES_SQLITE_PATH`, `MEMORIES_VECTOR_DIM`
  - `LOCAL_MEMORY_BASE_URL`, `LOCAL_MEMORY_API_KEY`, `LOCAL_MEMORY_NAMESPACE`
- Encryption (per-namespace):
  - `MEMORIES_ENCRYPTION_SECRET`
  - `MEMORIES_ENCRYPTION_NAMESPACES` (e.g., `secure,pii`)
  - `MEMORIES_ENCRYPTION_REGEX` (e.g., `^sec:`)
  - `MEMORIES_ENCRYPT_VECTORS`, `MEMORIES_ENCRYPT_TAGS`
- Embedder:
  - `MEMORIES_EMBEDDER`: `noop | mlx | ollama` (default: `noop`)
  - MLX: `MLX_MODEL`, `MLX_SERVICE_URL`, `MLX_MODELS_DIR`, `PYTHON_EXEC`, `PYTHONPATH`
  - Ollama: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`
- Decay:
  - `MEMORIES_DECAY_ENABLED`, `MEMORIES_DECAY_HALFLIFE_MS`

The app’s `provideMemories()` uses these envs via the memories package factories.
