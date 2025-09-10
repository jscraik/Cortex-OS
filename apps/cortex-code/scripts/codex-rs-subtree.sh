#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/../../.." && pwd)
PREFIX_PATH="apps/cortex-code"
UPSTREAM_REPO_PATH="$ROOT_DIR/external/openai-codex"
UPSTREAM_BRANCH="origin/main"
SPLIT_BRANCH="codex-rs-split"

usage() {
  cat <<USAGE
Usage: $0 <init|pull|status>

Commands:
  init    One-time: import upstream codex-rs as a subtree into $PREFIX_PATH
  pull    Fetch upstream and merge the latest codex-rs subtree into $PREFIX_PATH
  status  Show latest upstream split SHA and recorded baseline

Prereqs: git-subtree must be available (install latest Git).
Upstream: $UPSTREAM_REPO_PATH (submodule of openai/codex)
USAGE
}

require_subtree() {
  if ! git help -a | rg -q "git-subtree"; then
    echo "git-subtree not available. Install a recent Git with subtree support." >&2
    exit 1
  fi
}

split_update() {
  git -C "$UPSTREAM_REPO_PATH" fetch origin --prune --tags -q
  # Create/refresh a split branch inside the upstream repo for codex-rs
  git -C "$UPSTREAM_REPO_PATH" branch -D "$SPLIT_BRANCH" 2>/dev/null || true
  git -C "$UPSTREAM_REPO_PATH" subtree split --prefix codex-rs "$UPSTREAM_BRANCH" -b "$SPLIT_BRANCH"
}

record_baseline() {
  local sha="$1"
  printf "%s" "$sha" > "$ROOT_DIR/$PREFIX_PATH/UPSTREAM_REF"
  echo "Updated baseline at $PREFIX_PATH/UPSTREAM_REF to $sha"
}

cmd=${1:-}
case "$cmd" in
  init)
    require_subtree
    split_update
    # Import upstream history into the prefix path
    git subtree add --prefix "$PREFIX_PATH" "$UPSTREAM_REPO_PATH" "$SPLIT_BRANCH" --squash
    SHA=$(git -C "$UPSTREAM_REPO_PATH" rev-parse "$SPLIT_BRANCH")
    record_baseline "$SHA"
    ;;
  pull)
    require_subtree
    split_update
    git subtree pull --prefix "$PREFIX_PATH" "$UPSTREAM_REPO_PATH" "$SPLIT_BRANCH" --squash
    SHA=$(git -C "$UPSTREAM_REPO_PATH" rev-parse "$SPLIT_BRANCH")
    record_baseline "$SHA"
    ;;
  status)
    git -C "$UPSTREAM_REPO_PATH" fetch origin --prune --tags -q || true
    LATEST=$(git -C "$UPSTREAM_REPO_PATH" rev-list -1 "$UPSTREAM_BRANCH" -- codex-rs || echo "")
    RECORDED=""
    if [[ -f "$ROOT_DIR/$PREFIX_PATH/UPSTREAM_REF" ]]; then
      RECORDED=$(cat "$ROOT_DIR/$PREFIX_PATH/UPSTREAM_REF")
    fi
    echo "Latest upstream codex-rs commit: ${LATEST:-unknown}"
    echo "Recorded baseline              : ${RECORDED:-none}"
    ;;
  *)
    usage; exit 1;;
esac

