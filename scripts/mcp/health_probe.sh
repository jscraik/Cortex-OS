#!/usr/bin/env bash

# Health probe for the Cortex MCP HTTP endpoint.
# Performs two checks:
#   1. HTTP GET on the configured health URL.
#   2. JSON-RPC ping against the /mcp endpoint.
# Emits human-readable logs by default or JSON when --json is supplied.

set -euo pipefail

DEFAULT_PORT=3024
DEFAULT_HOST="127.0.0.1"

PORT="${MCP_PORT:-$DEFAULT_PORT}"
HOST="${MCP_HOST:-$DEFAULT_HOST}"
LOG_FILE="${MCP_HEALTH_LOG_PATH:-$HOME/.Cortex-OS/logs/mcp-health-probe.log}"
JSON_MODE=0

while [[ $# -gt 0 ]]; do
	case "$1" in
		--json)
			JSON_MODE=1
			shift
			;;
		--port)
			PORT="$2"
			shift 2
			;;
		--host)
			HOST="$2"
			shift 2
			;;
		--help|-h)
			cat <<EOF
Usage: $(basename "$0") [--json] [--host HOST] [--port PORT]
Environment overrides:
  MCP_HEALTH_URL   Fully qualified health URL
  MCP_ENDPOINT     Fully qualified MCP JSON-RPC endpoint
  MCP_HEALTH_LOG_PATH  Optional log file path
EOF
			exit 0
			;;
		*)
			echo "Unknown option: $1" >&2
			exit 2
			;;
	esac
done

HEALTH_URL="${MCP_HEALTH_URL:-http://${HOST}:${PORT}/health}"
MCP_ENDPOINT="${MCP_ENDPOINT:-http://${HOST}:${PORT}/mcp}"

mkdir -p "$(dirname "$LOG_FILE")"

timestamp() {
	date -Is
}

write_log() {
	local level="$1"
	shift
	if [[ $JSON_MODE -eq 0 ]]; then
		echo "[health-probe] $level: $*"
	fi
	echo "$(timestamp) level=${level} message=$*" >>"$LOG_FILE"
}

curl_health() {
	local status
	local body
	if ! response=$(curl -sS -w '\n%{http_code}' --max-time 5 "$HEALTH_URL" 2>/dev/null); then
		status=0
		body=""
	else
		status=${response##*$'\n'}
		body=${response%$'\n'*}
	fi
	printf '%s\n%s' "$status" "$body"
}

curl_ping() {
	local body
	body='{"jsonrpc":"2.0","id":"health-check","method":"ping","params":{"transport":"probe"}}'
	if ! response=$(curl -sS -w '\n%{http_code}' --max-time 5 -H 'Content-Type: application/json' -d "$body" "$MCP_ENDPOINT" 2>/dev/null); then
		printf '0\n'
		return
	fi
	printf '%s\n%s' "${response##*$'\n'}" "${response%$'\n'*}"
}

health_status=$(curl_health)
health_http_code=$(echo "$health_status" | head -n1)
health_body=$(echo "$health_status" | tail -n +2)

ping_status=$(curl_ping)
ping_http_code=$(echo "$ping_status" | head -n1)
ping_body=$(echo "$ping_status" | tail -n +2)

health_ok=$([[ "$health_http_code" =~ ^2..$ ]])
ping_ok=$([[ "$ping_http_code" =~ ^2..$ ]] && echo "$ping_body" | grep -q '"ok"')

if [[ $health_ok && $ping_ok ]]; then
	write_log INFO "MCP server healthy on port ${PORT}"
	if [[ $JSON_MODE -eq 1 ]]; then
		python3 - "$PORT" "$HOST" "$HEALTH_URL" "$MCP_ENDPOINT" "$health_http_code" "$ping_http_code" <<'PY'
import json, sys

port, host, health_url, mcp_endpoint, health_code, ping_code = sys.argv[1:]
payload = {
    "healthy": True,
    "port": int(port),
    "host": host,
    "health": {"url": health_url, "status": int(health_code or 0)},
    "ping": {"endpoint": mcp_endpoint, "status": int(ping_code or 0), "ok": True},
}
json.dump(payload, sys.stdout)
PY
	fi
	exit 0
fi

write_log ERROR "MCP health probe failed (health_http=${health_http_code}, ping_http=${ping_http_code})"

if [[ $JSON_MODE -eq 1 ]]; then
	python3 - "$PORT" "$HOST" "$HEALTH_URL" "$MCP_ENDPOINT" "$health_http_code" "$ping_http_code" "$health_body" "$ping_body" <<'PY'
import json, sys

port, host, health_url, mcp_endpoint, health_code, ping_code, health_body, ping_body = sys.argv[1:]
payload = {
    "healthy": False,
    "port": int(port),
    "host": host,
    "health": {"url": health_url, "status": int(health_code or 0), "body": health_body},
    "ping": {"endpoint": mcp_endpoint, "status": int(ping_code or 0), "body": ping_body},
}
json.dump(payload, sys.stdout)
PY
fi

exit 3
