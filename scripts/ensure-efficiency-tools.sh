#!/usr/bin/env bash
set -euo pipefail

# Fast guard: skip in CI environments
if [ "${CI:-}" = "true" ] || [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  exit 0
fi

missing=()
check_tool() { command -v "$1" >/dev/null 2>&1 || missing+=("$1"); }

# Core tools we expect available after install-efficiency-tools.sh
check_tool rg
check_tool ctags
check_tool hyperfine
check_tool delta
check_tool gitleaks
check_tool semgrep
check_tool codeql
check_tool src

if [ ${#missing[@]} -eq 0 ]; then
  # Everything looks good; be quiet by default
  exit 0
fi

echo "[ensure] Missing tools detected: ${missing[*]}"
echo "[ensure] Running scripts/install-efficiency-tools.sh to install prerequisites..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ ! -x "$ROOT_DIR/scripts/install-efficiency-tools.sh" ]; then
  chmod +x "$ROOT_DIR/scripts/install-efficiency-tools.sh" || true
fi

"$ROOT_DIR/scripts/install-efficiency-tools.sh"

echo "[ensure] Efficiency tools ensured."
