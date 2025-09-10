#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/../../.." && pwd)
UPSTREAM_DIR="$ROOT_DIR/external/openai-codex"

if [[ ! -d "$UPSTREAM_DIR" ]]; then
  echo "Upstream submodule missing: $UPSTREAM_DIR" >&2
  exit 1
fi

# Ensure we have the latest remote refs to compare against
git -C "$UPSTREAM_DIR" fetch origin --prune --tags -q || true

LATEST=$(git -C "$UPSTREAM_DIR" rev-list -1 origin/main -- codex-rs || echo "")
RECORDED=""
if [[ -f "$ROOT_DIR/apps/cortex-code/UPSTREAM_REF" ]]; then
  RECORDED=$(cat "$ROOT_DIR/apps/cortex-code/UPSTREAM_REF")
fi

echo "Upstream latest codex-rs commit: ${LATEST:-unknown}"
echo "Recorded baseline           : ${RECORDED:-none}"

if [[ -n "$LATEST" && -n "$RECORDED" && "$LATEST" != "$RECORDED" ]]; then
  echo "Drift detected: upstream advanced since baseline." >&2
  exit 2
fi

echo "No drift (or baseline not set)."
