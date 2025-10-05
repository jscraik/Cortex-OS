#!/usr/bin/env bash
set -euo pipefail

JSON=0
AUTO=${MCP_TUNNEL_AUTO_START:-1}
SERVICE_NAME="${MCP_TUNNEL_SERVICE_NAME:-mcp}"
LOCAL_PORT="${MCP_TUNNEL_LOCAL_PORT:-3024}"
EXPECTED_SERVICE="http://localhost:${LOCAL_PORT}"
TUNNEL_CONFIG="${MCP_TUNNEL_CONFIG:-config/cloudflared/mcp-tunnel.yml}"
WAIT_SECONDS="${MCP_TUNNEL_WAIT_SECONDS:-15}"
BRAND="[brAInwav tunnel]"

status="unknown"
mode="not-started"
reason=""
url=""
process_pid=""
exit_code=0

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
log_dir="$repo_root/logs"
quick_script="$repo_root/scripts/cloudflare/run-quick-tunnel.sh"
url_file="$log_dir/cloudflared-${SERVICE_NAME}.url"
log_file="$log_dir/cloudflared-${SERVICE_NAME}.log"
metrics_url="http://127.0.0.1:46889/metrics"

log(){
  if [[ $JSON -ne 1 ]]; then
    echo "$BRAND $*"
  fi
}

warn(){
  if [[ $JSON -ne 1 ]]; then
    echo "$BRAND WARN: $*" >&2
  fi
}

err(){
  if [[ $JSON -ne 1 ]]; then
    echo "$BRAND ERROR: $*" >&2
  fi
}

usage(){
  cat <<EOF
validate_cloudflare_tunnel.sh [--json] [--auto|--no-auto]
  --json      Emit JSON summary
  --auto      Force auto-start of quick tunnel (default via MCP_TUNNEL_AUTO_START=1)
  --no-auto   Disable auto-start even if environment enables it
EOF
}

for arg in "$@"; do
  case "$arg" in
    --json) JSON=1 ;;
    --auto) AUTO=1 ;;
    --no-auto) AUTO=0 ;;
    --help|-h) usage; exit 0 ;;
    *) err "Unknown option: $arg"; usage; exit 1 ;;
  esac
done

ensure_log_dir(){
  mkdir -p "$log_dir"
}

capture_url(){
  if [[ -f "$url_file" ]]; then
    url=$(head -n1 "$url_file" | tr -d '\n' || true)
  fi
}

emit_json(){
  local url_value="null"
  if [[ -n "$url" ]]; then
    url_value="\"$url\""
  fi
  printf '{"brand":"brAInwav","status":"%s","mode":"%s","reason":"%s","url":%s,"processPid":%s,"auto":%d,"config":"%s"}\n' \
    "$status" "$mode" "$reason" "$url_value" "${process_pid:-null}" "$AUTO" "$TUNNEL_CONFIG"
}

check_running(){
  if process_pid=$(pgrep -f "cloudflared.*${SERVICE_NAME}" | head -n1 || true); then
    if [[ -n "$process_pid" ]]; then
      status="operational"
      mode="existing-process"
      capture_url
      return 0
    fi
  fi
  return 1
}

start_quick_tunnel(){
  if [[ ! -x "$quick_script" ]]; then
    status="skipped"
    mode="quick-script-missing"
    reason="quick-tunnel-script-missing"
    exit_code=0
    return 1
  fi
  ensure_log_dir
  rm -f "$url_file"
  nohup "$quick_script" "$SERVICE_NAME" "$LOCAL_PORT" >>"$log_file" 2>&1 &
  local launcher_pid=$!
  log "Started quick tunnel bootstrap (pid $launcher_pid)"
  local elapsed=0
  while [[ $elapsed -lt $WAIT_SECONDS ]]; do
    sleep 1
    if check_running; then
      mode="quick-start"
      capture_url
      return 0
    fi
    ((elapsed++))
  done
  reason="quick-start-timeout"
  status="error"
  exit_code=1
  warn "Timed out waiting for cloudflared quick tunnel"
  return 1
}

check_cloudflared(){
  if ! command -v cloudflared >/dev/null 2>&1; then
    status="skipped"
    mode="cloudflared-missing"
    reason="cloudflared-not-installed"
    exit_code=0
    warn "cloudflared not installed; skipping tunnel validation"
    return 1
  fi
  return 0
}

validate_config(){
  if [[ -f "$TUNNEL_CONFIG" ]]; then
    if ! grep -q "${EXPECTED_SERVICE}" "$TUNNEL_CONFIG"; then
      warn "Expected service mapping to ${EXPECTED_SERVICE} not found in ${TUNNEL_CONFIG}"
    else
      log "Config service mapping OK -> ${EXPECTED_SERVICE}"
    fi
  else
    warn "Tunnel config not found at ${TUNNEL_CONFIG}; quick tunnel fallback only"
  fi
}

check_metrics(){
  if curl -fsS --max-time 2 "$metrics_url" >/dev/null 2>&1; then
    local active
    active=$(curl -fsS "$metrics_url" | grep -E 'cloudflared_tunnel_connections_active' | awk '{print $2}' | head -n1 || echo "?")
    log "Active tunnel connections: $active"
  else
    log "Metrics endpoint not reachable (skip)"
  fi
}

check_origin(){
  if curl -fsS --max-time 4 "http://127.0.0.1:${LOCAL_PORT}/mcp" >/dev/null 2>&1; then
    log "Origin MCP endpoint reachable"
    return 0
  fi
  status="error"
  reason="origin-unreachable"
  exit_code=5
  err "Origin MCP endpoint not reachable on ${LOCAL_PORT}"
  return 1
}

main(){
  check_cloudflared || {
    [[ $JSON -eq 1 ]] && emit_json
    exit $exit_code
  }

  validate_config

  if ! check_running; then
    if [[ $AUTO -eq 1 ]]; then
      start_quick_tunnel || true
    else
      status="skipped"
      mode="auto-disabled"
      reason="auto-start-disabled"
      exit_code=0
    fi
  fi

  if [[ $status == "operational" ]]; then
    check_metrics
    check_origin || true
  fi

  if [[ $status == "unknown" ]]; then
    status="error"
    mode="no-process"
    reason="cloudflared-not-running"
    exit_code=${exit_code:-1}
  fi

  if [[ $JSON -eq 1 ]]; then
    emit_json
  else
    log "status=${status} mode=${mode} reason=${reason:-none} pid=${process_pid:-none}"
    [[ -n "$url" ]] && log "tunnel-url=${url}"
  fi

  exit ${exit_code:-0}
}

main
