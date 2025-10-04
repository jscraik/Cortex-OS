#!/usr/bin/env bash
set -euo pipefail

# Wrapper to preserve historic entrypoint while using the ai-ml installer implementation.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DELEGATE="${SCRIPT_DIR}/ai-ml/install-efficiency-tools.sh"

if [ ! -x "$DELEGATE" ]; then
  echo "[install] Delegate script not found at $DELEGATE" >&2
  exit 1
fi

exec "$DELEGATE" "$@"
