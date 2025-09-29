#!/usr/bin/env bash
# brAInwav: repo-local wrapper for local-memory to make VS Code MCP config portable
# Co-authored-by: brAInwav Development Team
# Usage: wrap_local_memory.sh [--mcp] [other args...]

set -euo pipefail

# Allow override via env var for CI or custom installs
if [[ -n "${LOCAL_MEMORY_BIN:-}" ]]; then
  BINPATH="$LOCAL_MEMORY_BIN"
  echo "brAInwav: Using LOCAL_MEMORY_BIN override: $BINPATH"
else
  # 1) prefer command -v
  if command -v local-memory >/dev/null 2>&1; then
    BINPATH="$(command -v local-memory)"
  else
    # 2) common user path
    USER_BIN="$HOME/.local/bin/local-memory"
    if [[ -x "$USER_BIN" ]]; then
      BINPATH="$USER_BIN"
    else
      # 3) look in PATH directories explicitly (portable fallback)
      for d in "$HOME/.local/bin" "/usr/local/bin" "/opt/homebrew/bin" "/usr/bin"; do
        if [[ -x "$d/local-memory" ]]; then
          BINPATH="$d/local-memory"
          break
        fi
      done
    fi
  fi
fi

if [[ -z "${BINPATH:-}" ]]; then
  echo "brAInwav: ERROR - could not find 'local-memory' binary." >&2
  echo "brAInwav: Try installing it or set LOCAL_MEMORY_BIN to its path." >&2
  echo "brAInwav: For installation help, contact brAInwav Development Team." >&2
  exit 2
fi

# brAInwav: Starting local-memory MCP server with path: $BINPATH
echo "brAInwav: Launching local-memory MCP server..." >&2

# Exec the real binary with forwarded args
exec "$BINPATH" "$@"
