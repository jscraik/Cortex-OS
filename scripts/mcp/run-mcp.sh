#!/usr/bin/env bash
set -euo pipefail

# Resolve repo root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

# Load central port registry if present
if [[ -f config/ports.env ]]; then
  # shellcheck source=/dev/null
  source config/ports.env
fi

export NODE_ENV="production"
PORT_TO_USE="${MCP_PORT:-3000}"

# Free port if already in use
if lsof -ti tcp:"${PORT_TO_USE}" >/dev/null 2>&1; then
  echo "[mcp] Port ${PORT_TO_USE} in use — terminating existing listeners"
  # Try graceful first, then force if needed
  lsof -ti tcp:"${PORT_TO_USE}" | xargs -r kill || true
  sleep 0.5
  if lsof -ti tcp:"${PORT_TO_USE}" >/dev/null 2>&1; then
    lsof -ti tcp:"${PORT_TO_USE}" | xargs -r kill -9 || true
  fi
fi

export PORT="${PORT_TO_USE}"
echo "[mcp] Starting Cortex MCP server on PORT=${PORT}"

# Change into MCP package directory
cd packages/mcp

# Start FastAPI server (web UI + API) via uvicorn
HOST="0.0.0.0"
UVICORN_APP="mcp.webui.app:app"

if command -v uv >/dev/null 2>&1; then
  exec uv run python -m uvicorn "${UVICORN_APP}" --host "${HOST}" --port "${PORT}"
elif command -v python3 >/dev/null 2>&1; then
  exec python3 -m uvicorn "${UVICORN_APP}" --host "${HOST}" --port "${PORT}"
elif command -v python >/dev/null 2>&1; then
  exec python -m uvicorn "${UVICORN_APP}" --host "${HOST}" --port "${PORT}"
else
  echo "[mcp] No Python runtime found (need uv or python3/python)." >&2
  exit 127
fi
