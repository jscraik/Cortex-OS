#!/usr/bin/env bash
set -euo pipefail

# Consolidated ripgrep-based pattern guard
# Respects .rgignore and .gitignore by default.

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "ripgrep (rg) is required. Please install rg." >&2
  exit 2
fi

# Base include globs for speed
INCLUDES=(
  "--glob=*.{ts,tsx,js,jsx,py,rs,go}"
)

RED=\033[31m
YELLOW=\033[33m
GREEN=\033[32m
NC=\033[0m

failures=0

run_check() {
  local title="$1"; shift
  local pattern="$1"; shift
  local extra=("$@")

  echo -e "${YELLOW}Pattern:${NC} $title"
  if rg --hidden --follow --line-number --color=never "${INCLUDES[@]}" "${extra[@]}" -e "$pattern" .; then
    echo -e "${RED}Found:${NC} $title"
    failures=$((failures+1))
  else
    echo -e "${GREEN}OK:${NC} $title"
  fi
  echo
}

# Core checks
run_check "TODO/FIXME/XXX/HACK" "(?i)\b(TODO|FIXME|XXX|HACK)\b"
run_check "console.* in TS/JS" "\bconsole\.(log|warn|error|debug|info)\b" --glob="*.{ts,tsx,js,jsx}"
run_check "debugger statements" "\bdebugger\b" --glob="*.{ts,tsx,js,jsx}"
run_check "Possible secrets (loose)" "(?i)\b(password|passwd|secret|token|api[_-]?key|access[_-]?key|auth)\b" --glob="*.{ts,tsx,js,jsx,py}"

if [ "$failures" -gt 0 ]; then
  echo -e "${RED}Pattern guard failed with $failures findings.${NC}"
  exit 1
fi

echo -e "${GREEN}Pattern guard passed (no findings).${NC}"
