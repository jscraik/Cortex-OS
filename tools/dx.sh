#!/usr/bin/env bash
set -euo pipefail
cmd=${1:-help}
case "$cmd" in
  init) mise install && corepack enable && pnpm install ;;
  c) nx run-many -t "$2" --parallel ;;
  t) pnpm test ;;
  l) pnpm lint ;;
  b) pnpm build ;;
  py) (cd apps/cortex-py && uv sync && uv run pytest -q) ;;
  tui) (cd apps/cortex-tui && cargo run) ;;
  *) echo "init|c <target>|t|l|b|py|tui" ;;
esac
