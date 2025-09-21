# Cortex Py MLX Server

Experimental FastAPI service showcasing MLX integration.

## Features

- `GET /ping` returns a simple liveness check
- `GET /health` reports service readiness
- `POST /embed` computes embeddings with installed MLX when available (falls back to a deterministic embedding otherwise)

## Run

```bash
uvicorn py_mlx_server.main:app --host 0.0.0.0 --port 8000
```

Docker:

```bash
docker build -t cortex-mlx-embed:local services/py-mlx-server
docker run --rm -p 8000:8000 cortex-mlx-embed:local
```

## Embed API

- Request: `POST /embed`
  - Body: `{ "input": string | string[], "model?": string }` (also accepts `{ "texts": string[] }`)
- Response: `{ "embeddings": number[][], "model": string, "dimensions": number }`

Curl smoke test:

```bash
curl -sS http://127.0.0.1:8000/embed \
  -H 'Content-Type: application/json' \
  -d '{"input":"hello"}' | jq .dimensions
```

Environment variables:

- `HOST` (default `0.0.0.0`)
- `PORT` (default `8000`)
- `EMBEDDINGS_MODEL` (default `qwen3-embed`)
- `EMBEDDINGS_DIM` (default `768`)

### SSD cache mapping (recommended)

Point MLX/HF caches to your external SSD for speed and to save system disk:

```bash
export HF_HOME=/Volumes/ExternalSSD/huggingface_cache
export MLX_CACHE_DIR=/Volumes/ExternalSSD/ai-cache
# Optional: if your embedding pipeline reads local models directly
export MLX_MODEL_PATH=/Volumes/ExternalSSD/ai-models
```

You can copy `.env.mlx.example` to `.env.local` at the repo root for a consistent setup.
