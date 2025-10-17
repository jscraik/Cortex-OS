#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" )/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs/mcp-stack"

info() { printf '\033[1;34m[INFO]\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$1"; }

stop_pid_file() {
  local file_path="$1"
  local name="$2"
  if [ -f "$file_path" ]; then
    local pid
    pid="$(cat "$file_path" 2>/dev/null || true)"
    if [ -n "$pid" ] && ps -p "$pid" > /dev/null 2>&1; then
      info "Stopping $name (PID $pid)"
      kill "$pid" 2>/dev/null || true
      sleep 1
      if ps -p "$pid" > /dev/null 2>&1; then
        warn "$name did not stop gracefully; sending SIGKILL"
        kill -9 "$pid" 2>/dev/null || true
      fi
    fi
    rm -f "$file_path"
  fi
}

# Stop FastMCP server (uses recorded PID)
stop_pid_file "$LOG_DIR/mcp-server.pid" "FastMCP server wrapper"

# Stop Local Memory wrapper script
stop_pid_file "$LOG_DIR/local-memory-wrapper.pid" "Local Memory wrapper"

# Stop connectors runtime wrapper
stop_pid_file "$LOG_DIR/connectors-wrapper.pid" "Connectors runtime wrapper"

# Stop Local Memory REST server itself if running
LOCAL_MEMORY_PID_FILE="$ROOT_DIR/apps/cortex-os/packages/local-memory/logs/server.pid"
stop_pid_file "$LOCAL_MEMORY_PID_FILE" "Local Memory REST API"

# Stop vibe_check MCP helper if we spawned one
if pgrep -f "vibe-check-mcp.*2091" > /dev/null 2>&1; then
  PIDS="$(pgrep -f "vibe-check-mcp.*2091")"
  for pid in $PIDS; do
    info "Stopping vibe_check helper (PID $pid)"
    kill "$pid" 2>/dev/null || true
    sleep 1
    kill -9 "$pid" 2>/dev/null || true
  done
fi

# Optionally stop cloudflared? Not started here, so skip.

info "mcp-stack services stopped"
