#!/usr/bin/env bash
set -euo pipefail

echo "[brAInwav] devcontainer postCreate: running validations..."

WS="${CORTEX_HOME:-/opt/cortex-home}"
cd "$WS"

# Ensure Docker socket access if available
if [ -S /var/run/docker.sock ]; then
  echo "[brAInwav] Docker socket detected"
else
  echo "[brAInwav] Warning: Docker socket not available in container"
fi

# Prepare Nx cache dirs
mkdir -p .nx/cache || true

# Optional: lightweight typecheck to surface obvious issues (non-fatal)
if command -v pnpm >/dev/null 2>&1; then
  echo "[brAInwav] Running lightweight checks (non-fatal)"
  pnpm -v || true
fi

echo "[brAInwav] postCreate complete."
