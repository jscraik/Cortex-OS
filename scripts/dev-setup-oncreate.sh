#!/usr/bin/env bash
set -euo pipefail

echo "[brAInwav] devcontainer onCreate: initializing environment..."

# Ensure workspace ownership context
WS="${CORTEX_HOME:-/opt/cortex-home}"
cd "$WS"

# Git safety for containerized paths
git config --global --add safe.directory "$WS" || true

# Node/pnpm bootstrap via corepack + mise (if available)
if command -v corepack >/dev/null 2>&1; then
  corepack enable || true
fi

if command -v mise >/dev/null 2>&1; then
  echo "[brAInwav] Using mise to sync tool versions"
  mise install -y || true
fi

if [ -f pnpm-lock.yaml ]; then
  echo "[brAInwav] Installing JavaScript deps with pnpm"
  pnpm install --frozen-lockfile || pnpm install
fi

echo "[brAInwav] onCreate complete."
