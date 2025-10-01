#!/usr/bin/env bash
set -euo pipefail

echo "[brAInwav] devcontainer postStart: environment ready."

WS="${CORTEX_HOME:-/opt/cortex-home}"
cd "$WS"

# Print key tool versions for diagnostics
node -v || true
pnpm -v || true
rustc -V || true
python3 --version || true

echo "[brAInwav] postStart complete."
