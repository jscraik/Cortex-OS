#!/usr/bin/env bash
set -euo pipefail

# Wrapper to keep legacy script paths working while delegating to the ai-ml implementation.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DELEGATE="${SCRIPT_DIR}/ai-ml/ensure-efficiency-tools.sh"

if [ ! -x "$DELEGATE" ]; then
  echo "[ensure] Delegate script not found at $DELEGATE" >&2
  exit 1
fi

exec "$DELEGATE" "$@"
