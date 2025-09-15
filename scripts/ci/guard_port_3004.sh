#!/usr/bin/env bash
set -euo pipefail

# CI Guard: prevent reintroduction of forbidden port 3004 in runtime code.
# Allowed contexts:
#   - Forensic/diagnostic scripts: scripts/port3004_*.py, scripts/mitigate_port3004.sh, scripts/capture_port3004_attribution.sh
#   - Historical comments mentioning the migration rationale
#   - Generated caches, lockfiles, vendored third-party, .mypy_cache, .uv-cache, node_modules, dist, build artifacts
#
# Fails if a colon-form or plain numeric pattern appears in active runtime sources.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[guard_port_3004] Scanning for forbidden runtime references to port 3004..."

# Build inclusion globs (source code) and exclusion filters
INCLUDE_DIRS=(
  packages
  apps
  scripts
  services
  servers
  src
  libs
)

EXCLUDE_PATTERNS=(
  'scripts/port3004_'
  'scripts/mitigate_port3004.sh'
  'scripts/capture_port3004_attribution.sh'
  '.mypy_cache'
  '.uv-cache'
  'node_modules'
  'dist'
  'build'
  '.nx'
  '.git'
)

TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

# Collect candidate files
for dir in "${INCLUDE_DIRS[@]}"; do
  [ -d "$dir" ] || continue
  find "$dir" -type f \
    \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.py' -o -name '*.sh' -o -name '*.rs' -o -name '*.toml' -o -name '*.yml' -o -name '*.yaml' \) \
    >> "$TMP_FILE"
done

# Filter exclusions
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
  grep -v "$pattern" "$TMP_FILE" > "$TMP_FILE.filtered" || true
  mv "$TMP_FILE.filtered" "$TMP_FILE"
done

VIOLATIONS=()

while IFS= read -r file; do
  # Skip large binaries accidentally matched
  if file "$file" | grep -qi 'binary'; then continue; fi
  if grep -En '(:|port[^0-9]{0,5})3004' "$file" >/dev/null; then
    # Allow if only in a comment that clearly states historical context
    if grep -En '3004' "$file" | grep -iv 'historical\|migrated off\|forensic\|diagnostic' >/dev/null; then
      VIOLATIONS+=("$file")
    fi
  fi
done < "$TMP_FILE"

if [ ${#VIOLATIONS[@]} -gt 0 ]; then
  echo "[guard_port_3004] ❌ Forbidden references found:" >&2
  for f in "${VIOLATIONS[@]}"; do
    echo "  - $f" >&2
    grep -En '3004' "$f" | head -5 >&2
  done
  echo "[guard_port_3004] Failing. Remove or migrate these references to 3024." >&2
  exit 1
fi

echo "[guard_port_3004] ✅ No forbidden runtime port 3004 references detected."
