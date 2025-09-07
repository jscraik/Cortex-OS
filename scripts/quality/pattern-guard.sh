#!/usr/bin/env bash
# Fast pattern-based policy gate for staged or full repo files.
# Exits non-zero if disallowed patterns are found (unless allowlisted).
# Usage:
#   pattern-guard.sh              # Scan full repo (default)
#   pattern-guard.sh --staged     # Only scan staged files
#   pattern-guard.sh --changed    # Only scan git diff against origin/main
set -euo pipefail

mode="all"
if [[ "${1:-}" == "--staged" ]]; then
  mode="staged"
elif [[ "${1:-}" == "--changed" ]]; then
  mode="changed"
fi

get_file_list() {
  case "$mode" in
    staged)
      git diff --cached --name-only --diff-filter=ACMRTUXB | grep -E '\\.(ts|tsx|js|jsx|py|rs|go)$' || true ;;
    changed)
      git fetch -q origin main || true
      git diff --name-only origin/main...HEAD --diff-filter=ACMRTUXB | grep -E '\\.(ts|tsx|js|jsx|py|rs|go)$' || true ;;
    *)
      git ls-files | grep -E '\\.(ts|tsx|js|jsx|py|rs|go)$' || true ;;
  esac
}

FILES=( $(get_file_list) )
if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "[pattern-guard] No files to scan for mode=$mode"
  exit 0
fi

echo "[pattern-guard] Scanning ${#FILES[@]} files (mode=$mode)"

# Allowlist regex (joined by |) for secrets false positives etc.
ALLOWLIST='(__tests__/.*|fixtures?/.*|examples?/.*|test-data/.*)'

fail=0

declare -A CHECKS=(
  ["console statements"]='console\.(log|warn|error|debug|info)'
  ["debugger statements"]='\bdebugger\b'
  ["TODO markers"]='TODO|FIXME|HACK|XXX'
  ["suspicious secrets"]='password|secret|token|api[_-]?key|auth|bearer \w{20,}'
  ["OpenAI keys"]='sk-[a-zA-Z0-9]{20,}'
  ["GitHub classic tokens"]='ghp_[A-Za-z0-9]{36,}'
  ["GitHub fine-grained tokens"]='github_pat_[A-Za-z0-9_]{30,}'
  ["Sonar tokens"]='SONAR_TOKEN=.*[A-Fa-f0-9]{32,}'
  ["Generic high-entropy hex"]='\b[0-9a-fA-F]{40,}\b'
)

scan_pattern() {
  local label="$1"; shift
  local pattern="$1"; shift
  local tmp
  tmp=$(mktemp)
  # shellcheck disable=SC2068
  rg -n --color=never -e "$pattern" ${FILES[@]} > "$tmp" || true
  # Filter allowlist
  if grep -vE "^($ALLOWLIST)" "$tmp" | grep . > /dev/null 2>&1; then
    echo "❌ $label:" >&2
    grep -vE "^($ALLOWLIST)" "$tmp" >&2
    fail=1
  else
    echo "✅ $label: none"
  fi
  rm -f "$tmp"
}

for label in "${!CHECKS[@]}"; do
  scan_pattern "$label" "${CHECKS[$label]}"
done

if [[ $fail -ne 0 ]]; then
  echo "[pattern-guard] Policy violations detected." >&2
  exit 1
fi

echo "[pattern-guard] Clean"
