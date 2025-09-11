#!/usr/bin/env bash
set -euo pipefail
status="pass"
if ! command -v cargo >/dev/null 2>&1; then
  jq -n '{tool:"cargo",op:"verify",status:"skipped",reason:"cargo not installed"}'
  exit 0
fi
cargo test --quiet || status="fail"
jq -n --arg status "$status" '{tool:"cargo",op:"verify",status:$status}'
