#!/usr/bin/env bash

set -euo pipefail

HOST="${MCP_HOST:-127.0.0.1}"
PORT="${MCP_PORT:-3024}"
BASE_URL="http://${HOST}:${PORT}"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

function verify() {
	local path="$1"
	local expected="$2"
	local label="$3"

	echo "→ Checking ${label} (${path})"
	response="$(curl -s -w '\n%{http_code}' "${BASE_URL}${path}")"
	body="$(echo "${response}" | head -n -1)"
	status="$(echo "${response}" | tail -n 1)"

	if [[ "${status}" == "${expected}" ]]; then
		echo -e "  ${GREEN}✓${NC} Status ${status}"
		echo "  Sample: $(echo "${body}" | head -c 120)"
	else
		echo -e "  ${RED}✗${NC} Expected ${expected}, got ${status}"
		echo "  Response: ${body}"
		exit 1
	fi
}

echo "brAInwav MCP endpoint verification against ${BASE_URL}"
verify "/.well-known/mcp.json" "200" "MCP manifest"
verify "/.well-known/oauth-protected-resource" "200" "OAuth protected resource metadata"
verify "/health/auth" "200" "Auth health check"

echo -e "${GREEN}All endpoint checks passed${NC}"
