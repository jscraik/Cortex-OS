#!/usr/bin/env bash
set -euo pipefail

HOST="${1:-cortex-mcp.brainwav.io}"
PATH_SUFFIX="${2:-/health}"
TIMEOUT="${TIMEOUT:-3}"

curl -fsS --max-time "$TIMEOUT" "https://$HOST$PATH_SUFFIX" | jq . >/dev/null 2>&1 && {
  echo "[health] OK $HOST$PATH_SUFFIX"; exit 0; }
echo "[health] FAIL $HOST$PATH_SUFFIX" >&2
exit 1
