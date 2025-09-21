# MLX Setup Guide (macOS)

This guide standardizes MLX installation and mapping to an external SSD so all tools use the same caches and model location.

## 1) Install MLX tooling

You can use our helper script (safe, shell=False subprocess):

```bash
python3 scripts/maintenance/install-mlx-tools.py
```

This installs:
- `mlx-lm`, `mlx-vlm`, `transformers`, `torch`, etc.
- Tries to install `mlx-knife` from `mzau/mlx-knife` (optional but recommended)

## 2) Map caches and models to your External SSD

Copy the provided env template and adjust paths as needed:

```bash
cp .env.mlx.example .env.local
```

Edit `.env.local` so it points to your volume:

- `HF_HOME=/Volumes/ExternalSSD/huggingface_cache`
- `MLX_CACHE_DIR=/Volumes/ExternalSSD/ai-cache`
- `MLX_MODEL_PATH=/Volumes/ExternalSSD/ai-models` (optional)
- `MLX_EMBED_BASE_URL=http://127.0.0.1:8000` (if using the embeddings server)

You can also export in your shell profile instead of `.env.local`.

## 3) Verify MLX availability

We ship quick verifiers:

```bash
pnpm mlx:verify      # Node wrapper -> scripts/mlx/verify.mjs
pnpm mlx:verify:py   # Python -> scripts/mlx/verify.py
pnpm mlx:doctor      # Full diagnostics: env snapshot + mlx-knife + verify
```

Expected output should mention `MLX core: OK` and optionally `MLX-LM: OK`.

## 4) Start the embeddings server (optional)

A small FastAPI server is included for embeddings testing:

```bash
# Using our helper
pnpm mlx:serve   # Auto-loads .env.local so MLX_* and HF_* are in env
# or directly
uvicorn services/py-mlx-server/src/py_mlx_server/main:app --host 127.0.0.1 --port 8000
```

Smoke test:

```bash
curl -sS http://127.0.0.1:8000/health | jq .
curl -sS http://127.0.0.1:8000/embed -H 'Content-Type: application/json' -d '{"input":"hello"}' | jq .dimensions
```

## 5) Health endpoint in PRP Runner

PRP Runner exposes an MLX health probe:

- `GET /health/mlx` returns `{ mlx: { available, runner, details } }`

This uses a real import probe via `uv` or `python3`:
- Tries `uv run python -c "import mlx.core; import mlx_lm"`
- Falls back to `python3 -c ...`

## 6) Using mlx-knife models on External SSD

If you have local models under `/Volumes/ExternalSSD/ai-models`:
- Set `MLX_MODEL_PATH` to that folder if your adapter expects it.
- `mlx-knife list` should show models if its config/search path points there.
- Some flows use Hugging Face snapshot caches; ensure `HF_HOME` points to SSD.

## 7) Troubleshooting

- `mlx.core not found`: Re-run installers; ensure your Python is Apple Silicon and not Rosetta.
- `mlx-knife` not found: It’s optional. Reinstall via:
  ```bash
  pip install git+https://github.com/mzau/mlx-knife.git
  ```
- Health endpoint returns 503: Check that `python3` or `uv` can import MLX modules.

## 8) Performance tips

- Keep caches on SSD (env above) to avoid filling system disk.
- Use the memory-safe vitest wrapper to avoid runaway test workers:
  ```bash
  pnpm test:smart
  # or
  node scripts/vitest-safe.mjs run
  ```
