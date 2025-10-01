#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
DEFAULT_REPO_TOOLS_DIR="$ROOT_DIR/packages/agent-toolkit/tools"

export CORTEX_HOME="${CORTEX_HOME:-$HOME/.Cortex-OS}"
export AGENT_TOOLKIT_TOOLS_DIR="${AGENT_TOOLKIT_TOOLS_DIR:-$CORTEX_HOME/tools/agent-toolkit}"

mkdir -p "$AGENT_TOOLKIT_TOOLS_DIR"

if [ -d "$DEFAULT_REPO_TOOLS_DIR" ]; then
	if [ -z "$(ls -A "$AGENT_TOOLKIT_TOOLS_DIR")" ]; then
		echo "[agent-toolkit] Bootstrapping tools into $AGENT_TOOLKIT_TOOLS_DIR"
		cp -a "$DEFAULT_REPO_TOOLS_DIR"/. "$AGENT_TOOLKIT_TOOLS_DIR"/
	else
		echo "[agent-toolkit] Tools directory already populated: $AGENT_TOOLKIT_TOOLS_DIR"
	fi
else
	echo "[agent-toolkit] Warning: default repo tools directory not found at $DEFAULT_REPO_TOOLS_DIR" >&2
fi

if ! command -v chmod >/dev/null 2>&1; then
	echo "[agent-toolkit] Skipping chmod normalisation; 'chmod' not available" >&2
else
	find "$AGENT_TOOLKIT_TOOLS_DIR" -type f -name '*.sh' -exec chmod +x {} +
fi

echo "[agent-toolkit] CORTEX_HOME=$CORTEX_HOME"
echo "[agent-toolkit] AGENT_TOOLKIT_TOOLS_DIR=$AGENT_TOOLKIT_TOOLS_DIR"
