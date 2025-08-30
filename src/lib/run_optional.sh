#!/usr/bin/env sh
# Run a command only if its binary exists
run_optional() {
  local cmd="$1"
  shift
  if command -v "$cmd" >/dev/null 2>&1; then
    "$@"
  else
    echo "$cmd not available, skipping"
  fi
}
