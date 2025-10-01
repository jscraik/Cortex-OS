#!/usr/bin/env bash
# Harvest all MCP-related content from specific GitHub repositories into a temp folder.
# - Clones sst/opencode and openai/codex (shallow)
# - Finds any files/directories related to MCP (Model Context Protocol)
# - Copies them into a structured harvest folder with a manifest
# - Produces a summary.json and a tarball for portability
#
# Usage:
#   bash scripts/harvest-mcp.sh
#   # optionally specify a base dir:
#   BASE_DIR=/path/to/output bash scripts/harvest-mcp.sh

set -euo pipefail

# -------- config --------
REPOS=(
  "sst/opencode"
  "openai/codex"
)

NOW_TS="$(date +%Y%m%d-%H%M%S)"
BASE_DIR="${BASE_DIR:-"$PWD/.tmp/mcp-ecosystems-$NOW_TS"}"
CLONES="$BASE_DIR/clones"
HARVEST="$BASE_DIR/harvest"
LOG="$BASE_DIR/harvest.log"
SUMMARY_JSON="$BASE_DIR/summary.json"

mkdir -p "$CLONES" "$HARVEST"

log() { printf '%s %s\n' "[$(date -Is)]" "$*" | tee -a "$LOG"; }

clone_repo() {
  local repo="$1"
  local name="${repo##*/}"
  local owner="${repo%%/*}"
  local dest="$CLONES/${owner}-${name}"
  if [ -d "$dest/.git" ]; then
    log "Repo already exists: $repo -> $dest"
    return 0
  fi
  log "Cloning $repo into $dest (shallow)"
  git clone --depth 1 "https://github.com/$repo.git" "$dest" >>"$LOG" 2>&1
}

harvest_repo() {
  local repo="$1"
  local name="${repo##*/}"
  local owner="${repo%%/*}"
  local src_root="$CLONES/${owner}-${name}"
  local out_root="$HARVEST/${owner}-${name}"
  mkdir -p "$out_root"

  log "Harvesting MCP-related files from $repo"
  pushd "$src_root" >/dev/null

  # Find candidate files by content (case-insensitive) and by dir names.
  local grep_list="/tmp/grep_list_$$.txt"
  local dir_list="/tmp/dir_list_$$.txt"
  local dir_files="/tmp/dir_files_$$.txt"
  local final_list="/tmp/final_list_$$.txt"

  # Content search: include MCP, Model Context Protocol, and npm scope
  LC_ALL=C \
  grep -RIl -i --binary-files=without-match \
    --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist \
    --exclude-dir=build --exclude-dir=out --exclude-dir=.next \
    --exclude-dir=.cache --exclude-dir=vendor --exclude-dir=target \
    -E "(^|[^a-zA-Z])(mcp|model[ -]?context[ -]?protocol|@modelcontextprotocol)([^a-zA-Z]|$)" . \
    > "$grep_list" || true

  # Directory name search: anything with mcp or modelcontextprotocol in the name
  find . -type d \
    \( -iname "*mcp*" -o -iname "*modelcontextprotocol*" \) \
    -not -path "*/.git/*" -not -path "*/node_modules/*" -not -path "*/target/*" \
    -print > "$dir_list" || true

  # Expand matched directories to file paths
  : > "$dir_files"
  if [ -s "$dir_list" ]; then
    while IFS= read -r d; do
      find "$d" -type f -print >> "$dir_files"
    done < "$dir_list"
  fi

  # Combine
  cat "$grep_list" "$dir_files" 2>/dev/null | sed '/^$/d' | sort -u > "$final_list"

  # Save manifest and copy preserving relative structure
  cp "$final_list" "$out_root/_mcp_manifest_paths.txt" || :
  if [ -s "$final_list" ]; then
    rsync -aR --files-from="$final_list" ./ "$out_root/"
  fi

  # Clean temp lists
  rm -f "$grep_list" "$dir_list" "$dir_files" "$final_list"

  # Count summary
  local files_count
  files_count=$(find "$out_root" -type f | wc -l | awk '{print $1}')
  log "$repo: harvested $files_count files -> $out_root"

  popd >/dev/null
}

main() {
  log "Starting MCP harvest"
  log "Base directory: $BASE_DIR"

  for r in "${REPOS[@]}"; do
    clone_repo "$r"
  done

  for r in "${REPOS[@]}"; do
    harvest_repo "$r"
  done

  # Create tarball of harvest
  local tarball="$BASE_DIR/mcp-harvest-$NOW_TS.tgz"
  log "Creating archive: $tarball"
  tar -czf "$tarball" -C "$BASE_DIR" harvest

  # Write summary JSON
  {
    echo "{"
    echo "  \"base\": \"$BASE_DIR\","
    echo "  \"archive\": \"$tarball\","
    echo "  \"repos\": {"
    for r in "${REPOS[@]}"; do
      local name="${r##*/}"
      local owner="${r%%/*}"
      local out_root="$HARVEST/${owner}-${name}"
      local count
      count=$(find "$out_root" -type f | wc -l | awk '{print $1}')
      echo "    \"$r\": { \"files\": $count },"
    done | sed '$s/,$//'
    echo "  }"
    echo "}"
  } > "$SUMMARY_JSON"

  log "Harvest complete"
  printf '\nSummary: %s\n' "$SUMMARY_JSON"
  [ -f "$SUMMARY_JSON" ] && cat "$SUMMARY_JSON" || true
}

main "$@"
