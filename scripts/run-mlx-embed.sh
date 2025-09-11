#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/services/py-mlx-server"

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8000}"

echo "Starting MLX embeddings service on $HOST:$PORT"
exec uvicorn py_mlx_server.main:app --host "$HOST" --port "$PORT"

