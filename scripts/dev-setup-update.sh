#!/usr/bin/env bash
set -euo pipefail

echo "[brAInwav] devcontainer updateContent: syncing environment..."

WS="${CORTEX_HOME:-/opt/cortex-home}"
cd "$WS"

if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile || pnpm install
fi

echo "[brAInwav] updateContent complete."
