#!/usr/bin/env bash
set -euo pipefail

# Resolve repo root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

# Load central port registry if present
if [[ -f config/ports.env ]]; then
  # shellcheck source=/dev/null
  source config/ports.env
fi

# Configure Cortex Search API integration for brAInwav MCP server
export CORTEX_MCP_CORTEX_SEARCH_URL="http://127.0.0.1:3124/search"
export CORTEX_MCP_CORTEX_DOCUMENT_BASE_URL="http://127.0.0.1:3124/documents"
if [[ -f config/cortex-search.key ]]; then
  export CORTEX_MCP_CORTEX_SEARCH_API_KEY="$(cat config/cortex-search.key)"
fi

export NODE_ENV="production"
PORT_TO_USE="${PORT:-3024}"  # Use port 3024 as standard for MCP

# Free port if already in use
if lsof -ti tcp:"${PORT_TO_USE}" >/dev/null 2>&1; then
  echo "[mcp] Port ${PORT_TO_USE} in use — terminating existing listeners"
  # Try graceful first, then force if needed
  lsof -ti tcp:"${PORT_TO_USE}" | xargs -r kill || true
  sleep 0.5
  if lsof -ti tcp:"${PORT_TO_USE}" >/dev/null 2>&1; then
    lsof -ti tcp:"${PORT_TO_USE}" | xargs -r kill -9 || true
  fi
fi

export PORT="${PORT_TO_USE}"
echo "[mcp] Starting Cortex FastMCP server on PORT=${PORT}"

# Run from the root directory to avoid local package shadowing
cd "$ROOT_DIR"

# Start the FastMCP server (ChatGPT-compatible with HTTP transport)
if command -v uv >/dev/null 2>&1; then
  exec uv run python packages/cortex-mcp/cortex_fastmcp_server_v2.py
elif command -v python3 >/dev/null 2>&1; then
  exec python3 packages/cortex-mcp/cortex_fastmcp_server_v2.py
elif command -v python >/dev/null 2>&1; then
  exec python packages/cortex-mcp/cortex_fastmcp_server_v2.py
else
  echo "[mcp] No Python runtime found (need uv or python3/python)." >&2
  exit 127
fi
