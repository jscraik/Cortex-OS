---
title: Deployment
sidebar_label: Deployment
---

# Memories Deployment Guide

This guide summarizes common deployment configurations for the `@cortex-os/memories` package.

## Store Backends (Short- and Long-Term)

- `MEMORIES_SHORT_STORE`: `memory | sqlite | prisma | local` (default: `memory`)
- `MEMORIES_LONG_STORE`: `memory | sqlite | prisma | local` (default: `sqlite`)

SQLite options:

- `MEMORIES_SQLITE_PATH`: filesystem path (default: `./data/memories.db`)
- `MEMORIES_VECTOR_DIM`: embedding dimensions (default: `1536`)

Local REST store options:

- `LOCAL_MEMORY_BASE_URL`, `LOCAL_MEMORY_API_KEY`, `LOCAL_MEMORY_NAMESPACE`

## Encryption Policy

Enable at-rest encryption per namespace:

- `MEMORIES_ENCRYPTION_SECRET`: enables encryption when set
- `MEMORIES_ENCRYPTION_NAMESPACES`: comma-separated exact matches
- `MEMORIES_ENCRYPTION_REGEX`: regex pattern (e.g., `^sec:`)
- `MEMORIES_ENCRYPT_VECTORS&#61;true|false`: encrypt vectors (JSON)
- `MEMORIES_ENCRYPT_TAGS&#61;true|false`: encrypt tags (JSON)

## Embedder Selection

Choose an embedding provider:

- `MEMORIES_EMBEDDER`: `noop | mlx | ollama` (default: `noop`)

MLX options:

- `MLX_MODEL`: `qwen3-0.6b | qwen3-4b | qwen3-8b` (default: `qwen3-4b`)
- `MLX_EMBED_BASE_URL`: base URL for local MLX HTTP service (preferred)
- `MLX_SERVICE_URL`: legacy env; if set, calls `POST /embed` on this URL instead of local Python
- `MLX_MODELS_DIR`, `PYTHON_EXEC`, `PYTHONPATH`: advanced tuning for local Python execution

Ollama options:

- `OLLAMA_BASE_URL` (default: `http://localhost:11434`)
- `OLLAMA_MODEL` (default: `nomic-embed-text`)

## Decay Scoring

- `MEMORIES_DECAY_ENABLED&#61;true|false`
- `MEMORIES_DECAY_HALFLIFE_MS`: half-life in milliseconds

## Putting It Together

In your app bootstrap, wire the service with env-driven store + embedder:

```ts
import { createMemoryService, createPolicyAwareStoreFromEnv, createEmbedderFromEnv } from '@cortex-os/memories';

const store = createPolicyAwareStoreFromEnv();
const embedder = createEmbedderFromEnv();
export const memoryService = createMemoryService(store, embedder);
```

Example runnable script: `examples/memories-mlx/ingest-and-search.ts` (uses `MLX_EMBED_BASE_URL` or `MLX_SERVICE_URL`).

## Docker Compose
A minimal container setup:
```yaml
services:
  neo4j:
    image: neo4j:5
    ports: ["7687:7687"]
  qdrant:
    image: qdrant/qdrant:latest
    ports: ["6333:6333"]
```
Start services:
```bash
docker compose up -d neo4j qdrant

```