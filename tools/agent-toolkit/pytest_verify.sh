#!/usr/bin/env bash
set -euo pipefail
status="pass"
if ! command -v pytest >/dev/null 2>&1; then
  jq -n '{tool:"pytest",op:"verify",status:"skipped",reason:"pytest not installed"}'
  exit 0
fi
pytest -q || status="fail"
jq -n --arg status "$status" '{tool:"pytest",op:"verify",status:$status}'
