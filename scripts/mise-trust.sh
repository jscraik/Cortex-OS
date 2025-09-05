#!/usr/bin/env bash
# Automatically trust mise configuration if mise is available.
set -euo pipefail
if command -v mise >/dev/null 2>&1; then
  mise trust >/dev/null 2>&1 || true
fi
