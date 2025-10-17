#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" )/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs/mcp-stack"
mkdir -p "$LOG_DIR"

info() { printf '\033[1;34m[INFO]\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$1"; }
error() { printf '\033[1;31m[ERR ]\033[0m %s\n' "$1"; }

wait_for_health() {
  local url="$1"
  local name="$2"
  local log_path="$3"
  local timeout="${4:-90}"

  for ((i = 1; i <= timeout; i++)); do
    if curl -fsS "$url" > /dev/null 2>&1; then
      info "$name is responsive (health check)"
      return 0
    fi
    sleep 1
  done

  warn "$name did not report healthy within ${timeout}s. Inspect $log_path"
  return 1
}

start_local_memory() {
  local health_url="http://127.0.0.1:3028/healthz"
  if curl -fsS "$health_url" > /dev/null 2>&1; then
    info "Local Memory REST API already running on 3028"
    return 0
  fi

  info "Starting Local Memory REST API + vibe_check"
  (cd "$ROOT_DIR/apps/cortex-os/packages/local-memory" && \
    nohup pnpm start:service >> "$LOG_DIR/local-memory.log" 2>&1 &
    echo $! > "$LOG_DIR/local-memory-wrapper.pid")

  wait_for_health "$health_url" "Local Memory" "$LOG_DIR/local-memory.log" 120 || true
}

start_mcp_server() {
  local health_url="http://127.0.0.1:3024/health"
  if curl -fsS "$health_url" > /dev/null 2>&1; then
    info "FastMCP server already running on 3024"
    return 0
  fi

  info "Starting FastMCP server (HTTP transport)"
  (cd "$ROOT_DIR/packages/mcp-server" && \
    nohup pnpm run start:http >> "$LOG_DIR/mcp-server.log" 2>&1 &
    echo $! > "$LOG_DIR/mcp-server.pid")

  wait_for_health "$health_url" "FastMCP server" "$LOG_DIR/mcp-server.log" 120 || true
}

start_connectors_runtime() {
  local health_url="http://127.0.0.1:3026/health"
  if curl -fsS "$health_url" > /dev/null 2>&1; then
    info "Connectors runtime already running on 3026"
    return 0
  fi

  info "Starting connectors runtime (port 3026)"
  (
    cd "$ROOT_DIR"
    NO_AUTH="${NO_AUTH:-true}" \
    CONNECTORS_SIGNATURE_KEY="${CONNECTORS_SIGNATURE_KEY:-dev-local}" \
    nohup ./scripts/connectors/run-connectors-server.sh \
      >> "$LOG_DIR/connectors.log" 2>&1 &
    echo $! > "$LOG_DIR/connectors-wrapper.pid"
  )

  wait_for_health "$health_url" "Connectors runtime" "$LOG_DIR/connectors.log" 120 || true
}

start_local_memory
d_sleep=3
sleep "$d_sleep"
start_mcp_server
start_connectors_runtime

info "mcp-stack startup complete. Logs: $LOG_DIR"
