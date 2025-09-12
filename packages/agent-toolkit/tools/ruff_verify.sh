#!/usr/bin/env bash
set -euo pipefail
files="$@"
status="pass"
if ! command -v ruff >/dev/null 2>&1; then
  jq -n '{tool:"ruff",op:"verify",status:"skipped",reason:"ruff not installed"}'
  exit 0
fi
output=$(ruff check --exit-zero --output-format json "$@" 2>/dev/null || status="fail")

jq -n --arg status "$status" --arg output "$output" '{tool:"ruff",op:"verify",status:$status,output:$output}'
