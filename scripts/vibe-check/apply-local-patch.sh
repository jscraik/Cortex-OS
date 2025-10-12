#!/usr/bin/env bash
set -euo pipefail

PREFIX="${VIBE_CHECK_GLOBAL_PREFIX:-$(npm root -g)/@pv-bhat/vibe-check-mcp}"
CLI_PATH="$PREFIX/build/cli/index.js"
LLM_PATH="$PREFIX/build/utils/llm.js"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/../.. && pwd)"
SOURCE_DIR="$REPO_ROOT/scripts/vibe-check/overrides"

if [ ! -f "$CLI_PATH" ] || [ ! -f "$LLM_PATH" ]; then
  echo "brAInwav-vibe-check: unable to locate global @pv-bhat/vibe-check-mcp installation at $PREFIX" >&2
  exit 1
fi

if [ ! -f "$SOURCE_DIR/cli.index.js" ] || [ ! -f "$SOURCE_DIR/llm.js" ]; then
  echo "brAInwav-vibe-check: override templates missing; run from repo root" >&2
  exit 1
fi

backup() {
  local target="$1"
  local suffix
  suffix=$(date +%Y%m%d%H%M%S)
  cp "$target" "$target.$suffix.bak"
}

echo "brAInwav-vibe-check: applying CLI override -> $CLI_PATH"
backup "$CLI_PATH"
cp "$SOURCE_DIR/cli.index.js" "$CLI_PATH"

echo "brAInwav-vibe-check: applying LLM override -> $LLM_PATH"
backup "$LLM_PATH"
cp "$SOURCE_DIR/llm.js" "$LLM_PATH"

echo "brAInwav-vibe-check: overrides applied"
