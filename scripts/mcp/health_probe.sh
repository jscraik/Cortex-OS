#!/bin/bash

# Simple health probe for cortex-mcp; appends status to log
set -euo pipefail

HEALTH_URL="${MCP_HEALTH_URL:-http://127.0.0.1:3024/health}"
LOG_FILE="/Users/jamiecraik/.Cortex-OS/logs/mcp-health-probe.log"

mkdir -p "$(dirname "$LOG_FILE")"

TS="$(date -Is)"
STATUS="unknown"
LATENCY="-1"

if command -v curl >/dev/null 2>&1; then
  START=$(date +%s%3N 2>/dev/null || date +%s)
  if RESP=$(curl -fsS --max-time 5 "$HEALTH_URL" 2>/dev/null); then
    END=$(date +%s%3N 2>/dev/null || date +%s)
    STATUS="ok"
    LATENCY=$((END-START))
    echo "$TS status=$STATUS latency_ms=$LATENCY resp=$(echo "$RESP" | tr -d '\n' | head -c 200)" >> "$LOG_FILE"
    exit 0
  else
    echo "$TS status=error error=curl_failed" >> "$LOG_FILE"
    exit 3
  fi
else
  echo "$TS status=skipped reason=no_curl" >> "$LOG_FILE"
  exit 0
fi
#!/usr/bin/env bash
set -euo pipefail

PORT=3024
HOST=127.0.0.1
LAUNCH_LABEL="com.cortexos.mcp.server"
PLIST="$HOME/Library/LaunchAgents/${LAUNCH_LABEL}.plist"
TIMEOUT=5
JSON_MODE=0

for arg in "$@"; do
  case "$arg" in
    --json) JSON_MODE=1 ;;
    --help|-h)
      cat <<EOF
health_probe.sh [--json]
  --json   Emit structured JSON result (machine ingestion)
Exit Codes:
  0 healthy (initial or recovered)
  2 plist missing (cannot restart)
  3 unhealthy after recovery attempt
EOF
      exit 0
      ;;
  esac
done

log(){ echo "[health_probe] $*"; }
err(){ echo "[health_probe] ERROR: $*" >&2; }

# Simple JSON-RPC ping (FastMCP HTTP expects JSON-RPC at /mcp). We use a minimal request.
# Using curl --no-buffer to avoid buffering issues.

BODY='{"jsonrpc":"2.0","id":"health-check","method":"ping","params":{"transport":"probe"}}'

response=$(curl -sS --max-time ${TIMEOUT} -H 'Content-Type: application/json' -d "${BODY}" http://${HOST}:${PORT}/mcp || true)

if echo "$response" | grep -q '"status"' && echo "$response" | grep -q '"ok"'; then
  if [[ $JSON_MODE -eq 1 ]]; then
    printf '{"healthy":true,"recovered":false,"port":%s,"attemptedRestart":false,"raw":"%s"}\n' "$PORT" "$(echo "$response" | tr '"' '\\"')"
  else
    log "MCP server healthy on port ${PORT}."
  fi
  exit 0
fi

if [[ ! -f "$PLIST" ]]; then
  if [[ $JSON_MODE -eq 1 ]]; then
    printf '{"healthy":false,"error":"plist-missing","port":%s,"attemptedRestart":false,"raw":"%s"}\n' "$PORT" "$(echo "${response:-}" | tr '"' '\\"')"
  else
    err "Plist not found at $PLIST; cannot restart via launchctl."
  fi
  exit 2
fi

restart_method="kickstart"
if launchctl kickstart -k gui/$(id -u)/${LAUNCH_LABEL} 2>/dev/null; then
  : # success
else
  restart_method="unload-load"
  launchctl unload "$PLIST" || true
  launchctl load "$PLIST"
fi

sleep 2

response2=$(curl -sS --max-time ${TIMEOUT} -H 'Content-Type: application/json' -d "${BODY}" http://${HOST}:${PORT}/mcp || true)
if echo "$response2" | grep -q '"status"' && echo "$response2" | grep -q '"ok"'; then
  if [[ $JSON_MODE -eq 1 ]]; then
    printf '{"healthy":true,"recovered":true,"port":%s,"attemptedRestart":true,"restartMethod":"%s","raw":"%s"}\n' "$PORT" "$restart_method" "$(echo "$response2" | tr '"' '\\"')"
  else
    log "Recovery successful."
  fi
  exit 0
fi

if [[ $JSON_MODE -eq 1 ]]; then
  printf '{"healthy":false,"recovered":false,"port":%s,"attemptedRestart":true,"restartMethod":"%s","raw":"%s"}\n' "$PORT" "$restart_method" "$(echo "${response2:-}" | tr '"' '\\"')"
else
  err "Recovery attempt failed. See logs in ~/Library/Logs/${LAUNCH_LABEL}.*"
fi
exit 3
