#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

PORT="${CORTEX_SEARCH_PORT:-3124}"
LOG_DIR="${ROOT_DIR}/logs"
mkdir -p "$LOG_DIR"

if command -v uv >/dev/null 2>&1; then
  exec uv run uvicorn scripts.cortex_search_server:app --host 0.0.0.0 --port "$PORT"
elif command -v uvicorn >/dev/null 2>&1; then
  exec uvicorn scripts.cortex_search_server:app --host 0.0.0.0 --port "$PORT"
else
  python scripts/cortex_search_server.py
fi
