#!/usr/bin/env bash
# brAInwav MCP path checker
# Verifies presence and executability of local-memory binary and in-repo cortex-mcp server script.

set -euo pipefail

LOCAL_MEMORY_BIN="/Users/jamiecraik/.local/bin/local-memory"
REPO_MCP_PY="./packages/cortex-mcp/cortex_fastmcp_server_v2.py"

ok=true

echo "brAInwav: Starting MCP path checks..."

if [ -x "$LOCAL_MEMORY_BIN" ]; then
  echo "brAInwav: OK - found executable local-memory at: $LOCAL_MEMORY_BIN"
else
  echo "brAInwav: ERROR - missing or not executable: $LOCAL_MEMORY_BIN"
  echo "brAInwav: Hint: install local-memory (mise / pipx / package manager) or update .vscode/mcp.json to point to the correct path."
  ok=false
fi

if [ -f "$REPO_MCP_PY" ]; then
  if command -v python3 >/dev/null 2>&1; then
    echo "brAInwav: OK - found MCP server script at: $REPO_MCP_PY"
  else
    echo "brAInwav: WARNING - found $REPO_MCP_PY but python3 is not on PATH"
    ok=false
  fi
else
  echo "brAInwav: ERROR - missing MCP server script at: $REPO_MCP_PY"
  echo "brAInwav: Hint: ensure the repository includes packages/cortex-mcp and the file exists."
  ok=false
fi

if [ "$ok" = true ]; then
  echo "brAInwav: All checks passed. MCP config looks satisfiable on this machine."
  exit 0
else
  echo "brAInwav: One or more checks failed. See hints above to remediate."
  exit 2
fi
