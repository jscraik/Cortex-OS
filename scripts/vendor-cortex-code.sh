#!/usr/bin/env bash
set -euo pipefail

# brAInwav Cortex-OS: cortex-code vendor sync helper
# Mirrors external/openai-codex/codex-rs into apps/cortex-code using rsync.
#
# Usage:
#   scripts/vendor-cortex-code.sh            # dry-run (diff summary only)
#   scripts/vendor-cortex-code.sh --run      # apply sync + update UPSTREAM_REF
#   scripts/vendor-cortex-code.sh --run --force  # bypass dirty tree guard
#
# Notes:
# - Respects apps/cortex-code/.syncignore for excludes if present
# - Prints brAInwav-branded status lines

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$ROOT_DIR/external/openai-codex/codex-rs"
DST_DIR="$ROOT_DIR/apps/cortex-code"
SYNCIGNORE="$DST_DIR/.syncignore"
MODE="dry"
FORCE="0"

for arg in "$@"; do
  case "$arg" in
    --run) MODE="run" ;;
    --force) FORCE="1" ;;
    *) echo "[brAInwav][vendor] Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

echo "[brAInwav][vendor] cortex-code vendor sync ($MODE)"
echo "[brAInwav][vendor] SRC: $SRC_DIR"
echo "[brAInwav][vendor] DST: $DST_DIR"

if [[ ! -d "$SRC_DIR" ]]; then
  echo "[brAInwav][vendor][error] Source not found: $SRC_DIR" >&2
  echo "[brAInwav][vendor][hint] Ensure submodule 'external/openai-codex' is initialized and updated." >&2
  exit 3
fi

mkdir -p "$DST_DIR"

echo "[brAInwav][vendor] Computing diff summary..."
DIFF_SUMMARY=$(diff -qr "$SRC_DIR" "$DST_DIR" || true)
DIFF_COUNT=$(printf "%s\n" "$DIFF_SUMMARY" | sed '/^$/d' | wc -l | tr -d ' ')
printf "[brAInwav][vendor] Differences: %s\n" "$DIFF_COUNT"
printf "%s\n" "$DIFF_SUMMARY" | head -n 100 | sed 's/^/[diff] /'
if [[ "$DIFF_COUNT" -eq 0 && "$MODE" = "dry" ]]; then
  echo "[brAInwav][vendor] No differences. Dry-run complete."
  exit 0
fi

if [[ "$MODE" = "dry" ]]; then
  echo "[brAInwav][vendor] Dry-run only. Use --run to apply changes."
  exit 0
fi

# Guard against dirty tree unless forced
if [[ "$FORCE" != "1" ]]; then
  if ! git -C "$ROOT_DIR" diff --quiet --exit-code; then
    echo "[brAInwav][vendor][error] Working tree has uncommitted changes. Use --force to bypass." >&2
    exit 4
  fi
fi

echo "[brAInwav][vendor] Applying rsync..."
RSYNC_ARGS=( -a --delete )
if [[ -f "$SYNCIGNORE" ]]; then
  # Mirror each pattern as --exclude to ensure portability across rsync versions
  while IFS= read -r line; do
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    RSYNC_ARGS+=( --exclude "$line" )
  done < "$SYNCIGNORE"
fi
RSYNC_ARGS+=( "$SRC_DIR/" "$DST_DIR/" )
rsync "${RSYNC_ARGS[@]}"

UPSTREAM_SHA=""
if git -C "$ROOT_DIR/external/openai-codex" rev-parse HEAD >/dev/null 2>&1; then
  UPSTREAM_SHA=$(git -C "$ROOT_DIR/external/openai-codex" rev-parse HEAD)
fi
if [[ -z "$UPSTREAM_SHA" ]]; then
  echo "[brAInwav][vendor][warn] Could not determine upstream SHA from submodule; leaving UPSTREAM_REF unchanged."
else
  echo "$UPSTREAM_SHA" > "$ROOT_DIR/UPSTREAM_REF"
  echo "[brAInwav][vendor] Updated UPSTREAM_REF -> $UPSTREAM_SHA"
fi

echo "[brAInwav][vendor] Staging changes..."
git -C "$ROOT_DIR" add "$DST_DIR" "$ROOT_DIR/UPSTREAM_REF"

ADDED=$(git -C "$ROOT_DIR" diff --cached --numstat -- "$DST_DIR" | awk '{a+=$1} END{print a+0}')
DELETED=$(git -C "$ROOT_DIR" diff --cached --numstat -- "$DST_DIR" | awk '{d+=$2} END{print d+0}')
FILES_CHANGED=$(git -C "$ROOT_DIR" diff --cached --name-only -- "$DST_DIR" | wc -l | tr -d ' ')

SHORT_SHA=${UPSTREAM_SHA:0:8}
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

MSG="chore(vendor): sync apps/cortex-code from openai/codex codex-rs@${SHORT_SHA}

- Mirrored upstream Rust crates (codex-rs) into apps/cortex-code
- Updated UPSTREAM_REF to ${SHORT_SHA}
- Files changed: ${FILES_CHANGED}, +${ADDED} / -${DELETED}

Upstream: https://github.com/openai/codex/tree/${UPSTREAM_SHA}/codex-rs
Timestamp: ${TS}

Co-authored-by: brAInwav Development Team <dev@brainwav.dev>"

if git -C "$ROOT_DIR" diff --cached --quiet --exit-code; then
  echo "[brAInwav][vendor] No staged changes after rsync. Done."
  exit 0
fi

echo "[brAInwav][vendor] Committing..."
git -C "$ROOT_DIR" commit -m "$MSG" --no-verify
echo "[brAInwav][vendor] Done. You can now push: git push origin main"
