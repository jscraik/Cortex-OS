#!/usr/bin/env bash
set -euo pipefail
files="$@"
status="pass"
if ! command -v eslint >/dev/null 2>&1; then
  jq -n '{tool:"eslint",op:"verify",status:"skipped",reason:"eslint not installed"}'
  exit 0
fi
output=$(eslint --max-warnings=0 --format json $files 2>/dev/null || status="fail")

jq -n --arg status "$status" --arg output "$output" '{tool:"eslint",op:"verify",status:$status,output:$output}'
