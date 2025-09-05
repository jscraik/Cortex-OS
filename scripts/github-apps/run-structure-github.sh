#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -f config/ports.env ]]; then
  # shellcheck source=/dev/null
  source config/ports.env
fi

export NODE_ENV="production"
PORT_TO_USE="${STRUCTURE_PORT:-3003}"

if lsof -ti tcp:"${PORT_TO_USE}" >/dev/null 2>&1; then
  echo "[github-structure] Port ${PORT_TO_USE} in use — terminating existing listeners"
  lsof -ti tcp:"${PORT_TO_USE}" | xargs -r kill || true
  sleep 0.5
  if lsof -ti tcp:"${PORT_TO_USE}" >/dev/null 2>&1; then
    lsof -ti tcp:"${PORT_TO_USE}" | xargs -r kill -9 || true
  fi
fi

export PORT="${PORT_TO_USE}"
echo "[github-structure] Starting @cortex-os/cortex-structure-github on PORT=${PORT}"

if [[ ! -f packages/cortex-structure-github/dist/server/start.js ]]; then
  echo "[github-structure] dist missing — building..."
  pnpm -C packages/cortex-structure-github build
fi
if command -v pnpm >/dev/null 2>&1; then
  exec pnpm -C packages/cortex-structure-github start
else
  echo "[github-structure] pnpm not found in PATH — starting with node"
  exec node packages/cortex-structure-github/dist/server/start.js
fi
