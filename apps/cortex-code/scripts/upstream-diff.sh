#!/usr/bin/env bash
set -euo pipefail

# Compare this workspace copy of codex-rs against the upstream submodule.
# Usage:
#   apps/cortex-code/scripts/upstream-diff.sh [<upstream-path>]
# Default upstream path: external/openai-codex/codex-rs (from monorepo root)

ROOT_DIR=$(cd "$(dirname "$0")/../../.." && pwd)
LEFT="$ROOT_DIR/apps/cortex-code"
RIGHT="${1:-$ROOT_DIR/external/openai-codex/codex-rs}"

if [[ ! -d "$RIGHT" ]]; then
  echo "Upstream path not found: $RIGHT" >&2
  exit 1
fi

echo "Comparing local: $LEFT"
echo "     to upstream: $RIGHT"
echo

# Find common crates (top-level directories in both trees)
mapfile -t COMMON < <(comm -12 <(ls -1d "$LEFT"/*/ | xargs -n1 basename | sort) \
                              <(ls -1d "$RIGHT"/*/ | xargs -n1 basename | sort))

if [[ ${#COMMON[@]} -eq 0 ]]; then
  echo "No common crates found." >&2
  exit 1
fi

echo "Common crates: ${COMMON[*]}"
echo

RC=0
for d in "${COMMON[@]}"; do
  echo "--- $d ---"
  # Summarize quick diff; ignore target dirs
  if ! diff -qr -x target "$LEFT/$d" "$RIGHT/$d" | sed 's/^/  /'; then
    RC=1
  fi
  echo
done

exit $RC
