#!/usr/bin/env bash
set -euo pipefail

echo "[mcp-install] Cortex-OS MCP / Agent Toolkit Installer"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LAUNCH_AGENTS="$HOME/Library/LaunchAgents"
PLIST_SRC="packages/mcp/com.cortexos.mcp.server.plist"
HEALTH_PLIST_SRC="packages/mcp/com.cortexos.mcp.server.health.plist"

if [[ ! -f "$ROOT_DIR/$PLIST_SRC" ]]; then
  echo "[error] Missing primary LaunchAgent plist: $PLIST_SRC" >&2
  exit 1
fi

echo "[step] Ensuring pnpm & dependencies"
command -v pnpm >/dev/null 2>&1 || npm install -g pnpm
pnpm install --filter "@cortex-os/agent-toolkit..." --filter "@cortex-os/contracts..." --filter "@cortex-os/mcp..." || pnpm install

echo "[step] Building packages (affected)"
pnpm build:smart || pnpm build --filter @cortex-os/agent-toolkit

echo "[step] Installing LaunchAgent"
mkdir -p "$LAUNCH_AGENTS"
cp "$ROOT_DIR/$PLIST_SRC" "$LAUNCH_AGENTS/" 
launchctl unload "$LAUNCH_AGENTS/$(basename "$PLIST_SRC")" 2>/dev/null || true
launchctl load "$LAUNCH_AGENTS/$(basename "$PLIST_SRC")"

if [[ -f "$ROOT_DIR/$HEALTH_PLIST_SRC" ]]; then
  echo "[step] Installing Health Probe LaunchAgent (optional)"
  cp "$ROOT_DIR/$HEALTH_PLIST_SRC" "$LAUNCH_AGENTS/" 
  launchctl unload "$LAUNCH_AGENTS/$(basename "$HEALTH_PLIST_SRC")" 2>/dev/null || true
  launchctl load "$LAUNCH_AGENTS/$(basename "$HEALTH_PLIST_SRC")"
fi

echo "[step] Verifying health probe"
if ./scripts/mcp/health_probe.sh --json >/tmp/mcp_health.json 2>/dev/null; then
  echo "[ok] Health probe JSON:" && cat /tmp/mcp_health.json | jq '.summary // .' || true
else
  echo "[warn] Health probe failed; check logs under ~/Library/Logs/com.cortexos.mcp.server.*" >&2
fi

echo "[step] Diagnostics run"
if ./scripts/mcp/mcp_diagnose.sh --json >/tmp/mcp_diag.json 2>/dev/null; then
  echo "[ok] Diagnostics summary:" && cat /tmp/mcp_diag.json | jq '.summary'
else
  echo "[warn] Diagnostics reported issues" >&2
  cat /tmp/mcp_diag.json 2>/dev/null || true
fi

echo "[done] Installation complete. Server should be reachable on http://localhost:3024/mcp"
