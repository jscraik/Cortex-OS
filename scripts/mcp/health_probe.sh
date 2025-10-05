#!/usr/bin/env bash
# brAInwav Cortex-OS MCP health probe (macOS compatible)
set -euo pipefail

PORT=${MCP_PORT:-3024}
HOST=${MCP_HOST:-127.0.0.1}
TRANSPORT_PATH=${MCP_TRANSPORT_PATH:-/mcp}
HEALTH_URL="http://${HOST}:${PORT}${TRANSPORT_PATH}"
LAUNCH_LABEL="com.cortexos.mcp.server"
PLIST="$HOME/Library/LaunchAgents/${LAUNCH_LABEL}.plist"
LOG_FILE="/Users/jamiecraik/.Cortex-OS/logs/mcp-health-probe.log"
TIMEOUT=5
JSON_MODE=0
BRAND_TAG="[brAInwav health]"

usage(){
  cat <<'EOF'
health_probe.sh [--json]
  --json   Emit structured JSON summary
EOF
}

for arg in "$@"; do
  case "$arg" in
    --json) JSON_MODE=1 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "$BRAND_TAG unknown option: $arg" >&2; usage; exit 1 ;;
  esac
done

iso_timestamp(){
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

mkdir -p "$(dirname "$LOG_FILE")"

if ! command -v curl >/dev/null 2>&1; then
  ts=$(iso_timestamp)
  echo "$ts brand=brAInwav status=skipped reason=no_curl" >> "$LOG_FILE"
  if [[ $JSON_MODE -eq 1 ]]; then
    printf '{"brand":"brAInwav","healthy":false,"reason":"no-curl","recovered":false,"attemptedRestart":false,"port":%d}\n' "$PORT"
  fi
  exit 0
fi

BODY='{"jsonrpc":"2.0","id":"health-check","method":"ping","params":{"transport":"probe","brand":"brAInwav"}}'

curl_ping(){
  curl -fsS --max-time "$TIMEOUT" -H 'Content-Type: application/json' -d "$BODY" "$HEALTH_URL" 2>/dev/null || true
}

to_json_string(){
  python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))'
}

log_result(){
  local ts="$1"
  local status="$2"
  local extra="$3"
  echo "$ts brand=brAInwav status=$status $extra" >> "$LOG_FILE"
}

response=$(curl_ping)

if [[ -n "$response" ]] && echo "$response" | grep -q '"status"' && echo "$response" | grep -qi 'ok'; then
  ts=$(iso_timestamp)
  log_result "$ts" "ok" "latency_ms=-1"
  if [[ $JSON_MODE -eq 1 ]]; then
    printf '{"brand":"brAInwav","healthy":true,"recovered":false,"attemptedRestart":false,"port":%d,"raw":%s}\n' "$PORT" "$(printf '%s' "$response" | to_json_string)"
  else
    echo "$BRAND_TAG MCP server healthy on port $PORT"
  fi
  exit 0
fi

if [[ ! -f "$PLIST" ]]; then
  ts=$(iso_timestamp)
  log_result "$ts" "error" "reason=plist_missing"
  if [[ $JSON_MODE -eq 1 ]]; then
    printf '{"brand":"brAInwav","healthy":false,"recovered":false,"attemptedRestart":false,"error":"plist-missing","port":%d}\n' "$PORT"
  else
    echo "$BRAND_TAG LaunchAgent plist missing at $PLIST" >&2
  fi
  exit 2
fi

restart_method="kickstart"
if ! launchctl kickstart -k "gui/$(id -u)/${LAUNCH_LABEL}" 2>/dev/null; then
  restart_method="unload-load"
  launchctl unload "$PLIST" >/dev/null 2>&1 || true
  launchctl load "$PLIST"
fi
sleep 2

response_after=$(curl_ping)
if [[ -n "$response_after" ]] && echo "$response_after" | grep -q '"status"' && echo "$response_after" | grep -qi 'ok'; then
  ts=$(iso_timestamp)
  log_result "$ts" "recovered" "method=$restart_method"
  if [[ $JSON_MODE -eq 1 ]]; then
    printf '{"brand":"brAInwav","healthy":true,"recovered":true,"attemptedRestart":true,"restartMethod":"%s","port":%d,"raw":%s}\n' "$restart_method" "$PORT" "$(printf '%s' "$response_after" | to_json_string)"
  else
    echo "$BRAND_TAG Recovery successful via $restart_method"
  fi
  exit 0
fi

ts=$(iso_timestamp)
log_result "$ts" "error" "reason=recovery_failed"
if [[ $JSON_MODE -eq 1 ]]; then
  printf '{"brand":"brAInwav","healthy":false,"recovered":false,"attemptedRestart":true,"restartMethod":"%s","port":%d,"raw":%s}\n' "$restart_method" "$PORT" "$(printf '%s' "${response_after:-}" | to_json_string)"
else
  echo "$BRAND_TAG Recovery attempt failed; inspect ~/Library/Logs/${LAUNCH_LABEL}.*" >&2
fi
exit 3
