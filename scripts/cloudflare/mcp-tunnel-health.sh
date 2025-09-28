#!/usr/bin/env bash
set -euo pipefail

HOST="${1:-cortex-mcp.brainwav.io}"
PATH_SUFFIX="${2:-/health}"
TIMEOUT="${TIMEOUT:-3}"
ACCEPT_HEADER="${ACCEPT_HEADER:-}"

if [[ "$PATH_SUFFIX" == /mcp* ]]; then
	# The MCP SSE endpoint only returns 200 when the client advertises text/event-stream
	ACCEPT_HEADER="${ACCEPT_HEADER:-text/event-stream}"
fi

URL="https://$HOST$PATH_SUFFIX"

CURL_CMD=(curl -fsS --max-time "$TIMEOUT")
if [[ -n "$ACCEPT_HEADER" ]]; then
	CURL_CMD+=(-H "Accept: $ACCEPT_HEADER")
fi

if [[ "$PATH_SUFFIX" == /mcp* && "$ACCEPT_HEADER" == "text/event-stream" ]]; then
	# For SSE responses, just assert a 200 status code instead of piping to jq
	STATUS=$("${CURL_CMD[@]}" -o /dev/null --write-out "%{http_code}" "$URL")
	if [[ "$STATUS" == "200" ]]; then
		echo "[health] OK $HOST$PATH_SUFFIX"
		exit 0
	fi
	echo "[health] FAIL $HOST$PATH_SUFFIX (status $STATUS)" >&2
	exit 1
fi

if "${CURL_CMD[@]}" "$URL" | jq . >/dev/null 2>&1; then
	echo "[health] OK $HOST$PATH_SUFFIX"
	exit 0
fi

echo "[health] FAIL $HOST$PATH_SUFFIX" >&2
exit 1
