#!/usr/bin/env bash
set -euo pipefail

# Safe migration helper for legacy Hugging Face cache directories.
# Moves any /Volumes/ExternalSSD/ai-cache/huggingface/models--* into the hub/ subdir,
# merging into existing folders using rsync. Supports --dry-run and --source/--dest overrides.

usage() {
  cat <<EOF
Usage: $(basename "$0") [--dry-run] [--source PATH] [--dest PATH]

Options:
  --dry-run       Show what would be moved, but don't modify files
  --source PATH   Source huggingface dir (default: /Volumes/ExternalSSD/ai-cache/huggingface)
  --dest PATH     Destination hub dir (default: <source>/hub)

Examples:
  $(basename "$0") --dry-run
  $(basename "$0") --source /path/to/hf --dest /path/to/hf/hub
EOF
}

DRY_RUN=0
SOURCE="/Volumes/ExternalSSD/ai-cache/huggingface"
DEST=""

while [[ ${#} -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --source) SOURCE="$2"; shift 2 ;;
    --dest) DEST="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 2 ;;
  esac
done

if [[ -z "$DEST" ]]; then
  DEST="$SOURCE/hub"
fi

if [[ ! -d "$SOURCE" ]]; then
  echo "Source directory does not exist: $SOURCE" >&2
  exit 2
fi

mkdir -p "$DEST"

shopt -s nullglob
legacy=("$SOURCE"/models--*)
shopt -u nullglob

if [[ ${#legacy[@]} -eq 0 ]]; then
  echo "No legacy models found in $SOURCE"
  exit 0
fi

for src in "${legacy[@]}"; do
  name=$(basename "$src")
  dst="$DEST/$name"
  echo
  echo "Processing: $src -> $dst"
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "dry-run: would create $dst if missing"
    echo "dry-run: would rsync from $src/ to $dst/"
    continue
  fi
  mkdir -p "$dst"
  # rsync with attributes, verbose, and remove source files after copy
  rsync -avh --progress --remove-source-files "$src/" "$dst/"
  # remove any now-empty dirs in the source tree
  find "$src" -type d -empty -delete || true
  # if the source dir itself is empty after deletion, remove it
  if [[ -d "$src" && ! $(ls -A "$src") ]]; then
    rmdir "$src" || true
    echo "Removed empty legacy dir: $src"
  fi
done

echo
printf "Migration complete. Hub now contains:\n"
ls -la "$DEST"

exit 0
