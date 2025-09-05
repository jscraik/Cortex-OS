#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ -f config/ports.env ]]; then
  # shellcheck source=/dev/null
  source config/ports.env
fi

export NODE_ENV="production"
PORT_TO_USE="${SEMGREP_PORT:-3002}"

if lsof -ti tcp:"${PORT_TO_USE}" >/dev/null 2>&1; then
  echo "[github-semgrep] Port ${PORT_TO_USE} in use — terminating existing listeners"
  lsof -ti tcp:"${PORT_TO_USE}" | xargs -r kill || true
  sleep 0.5
  if lsof -ti tcp:"${PORT_TO_USE}" >/dev/null 2>&1; then
    lsof -ti tcp:"${PORT_TO_USE}" | xargs -r kill -9 || true
  fi
fi

export PORT="${PORT_TO_USE}"
echo "[github-semgrep] Starting @cortex-os/cortex-semgrep-github on PORT=${PORT}"

if [[ ! -f packages/cortex-semgrep-github/dist/server/start.js ]]; then
  echo "[github-semgrep] dist missing — building..."
  pnpm -C packages/cortex-semgrep-github build
fi
if command -v pnpm >/dev/null 2>&1; then
  exec pnpm -C packages/cortex-semgrep-github start
else
  echo "[github-semgrep] pnpm not found in PATH — starting with node"
  exec node packages/cortex-semgrep-github/dist/server/start.js
fi
