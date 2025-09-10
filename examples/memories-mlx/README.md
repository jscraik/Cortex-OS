# Memories + MLX Demo Server

Small HTTP server showcasing `@cortex-os/memories` wired to the MLX embeddings service.

Endpoints
- `GET /health`: returns status and embedder name
- `POST /ingest`: body `{ text: string, id?: string, kind?: string, tags?: string[] }`
- `GET /search?query=...&limit=5`: returns `{ count, results: [{ id, score, text }] }`

Local Run
- Start MLX embeddings service:
  - `pnpm mlx:serve` (FastAPI at `http://127.0.0.1:8000`)
- Start demo server:
  - `pnpm demo:serve` (Node at `http://127.0.0.1:8088`)

Compose
- Start only MLX service (default): `docker compose up -d` (runs `mlx-embed`)
- Start demo server (profile): `docker compose --profile demo up demo --abort-on-container-exit`

Quick Test
```bash
curl -sS http://127.0.0.1:8088/health | jq .
curl -sS -X POST http://127.0.0.1:8088/ingest -H 'Content-Type: application/json' -d '{"text":"The quick brown fox", "tags":["example"]}' | jq .
curl -sS 'http://127.0.0.1:8088/search?query=brown&limit=5' | jq .
```

Environment
- Demo uses `MEMORIES_EMBEDDER=mlx` and `MLX_EMBED_BASE_URL` (defaults to `http://127.0.0.1:8000` when not set).
- Compose demo points to `http://mlx-embed:8000` and uses an in-memory store for portability.

