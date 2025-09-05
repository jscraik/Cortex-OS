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
PORT_TO_USE="${GITHUB_AI_PORT:-3001}"

# Free port if already in use
if lsof -ti tcp:"${PORT_TO_USE}" >/dev/null 2>&1; then
  echo "[github-ai] Port ${PORT_TO_USE} in use — terminating existing listeners"
  # Try graceful first, then force if needed
  lsof -ti tcp:"${PORT_TO_USE}" | xargs -r kill || true
  sleep 0.5
  if lsof -ti tcp:"${PORT_TO_USE}" >/dev/null 2>&1; then
    lsof -ti tcp:"${PORT_TO_USE}" | xargs -r kill -9 || true
  fi
fi

export PORT="${PORT_TO_USE}"
echo "[github-ai] Starting @cortex-os/cortex-ai-github on PORT=${PORT}"

# Build if needed
if [[ ! -f packages/cortex-ai-github/dist/server/start.js ]]; then
  echo "[github-ai] dist missing — building..."
  pnpm -C packages/cortex-ai-github build
fi
if command -v pnpm >/dev/null 2>&1; then
  exec pnpm -C packages/cortex-ai-github start
else
  echo "[github-ai] pnpm not found in PATH — starting with node"
  exec node packages/cortex-ai-github/dist/server/start.js
fi
