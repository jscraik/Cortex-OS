#!/usr/bin/env bash
# brAInwav Cortex-OS MCP port guard
set -euo pipefail

PORT=3024
PORT=3024
HOST=127.0.0.1
FORCE=0
JSON=0
RESTART=0
DEFAULT_LABEL="com.cortexos.mcp.server"
LAUNCH_AGENT_LABEL="${LAUNCH_AGENT_LABEL:-$DEFAULT_LABEL}"
LAUNCHCTL_DOMAIN="${LAUNCHCTL_DOMAIN:-gui/$(id -u)}"
USER_PLIST_DEFAULT="$HOME/Library/LaunchAgents/${LAUNCH_AGENT_LABEL}.plist"
LAUNCH_AGENT_PLIST="${LAUNCH_AGENT_PLIST:-$USER_PLIST_DEFAULT}"
BRAND_PREFIX="[brAInwav guard]"
launch_agent_bootout="not-attempted"
launch_agent_restart="not-requested"
previous_launch_agent_active=0

log(){
  if [[ $JSON -ne 1 ]]; then
    echo "$BRAND_PREFIX $*"
  fi
}

warn(){
  if [[ $JSON -ne 1 ]]; then
    echo "$BRAND_PREFIX WARN: $*" >&2
  fi
}

error(){
  if [[ $JSON -ne 1 ]]; then
    echo "$BRAND_PREFIX ERROR: $*" >&2
  fi
}

set_launch_agent_plist(){
  if [[ -n "${custom_plist:-}" ]]; then
    LAUNCH_AGENT_PLIST="$custom_plist"
  else
    LAUNCH_AGENT_PLIST="$HOME/Library/LaunchAgents/${LAUNCH_AGENT_LABEL}.plist"
  fi
}

ensure_launch_agent_bootout(){
  if [[ $FORCE -eq 0 ]]; then
    launch_agent_bootout="not-required"
    return 0
  fi
  if ! command -v launchctl >/dev/null 2>&1; then
    launch_agent_bootout="launchctl-missing"
    warn "launchctl not available; cannot manage LaunchAgent"
    return 0
  fi
  local target="$LAUNCHCTL_DOMAIN/$LAUNCH_AGENT_LABEL"
  if ! launchctl print "$target" >/dev/null 2>&1; then
    launch_agent_bootout="not-found"
    return 0
  fi

  if launchctl bootout "$target" >/dev/null 2>&1; then
    launch_agent_bootout="bootout-success"
    previous_launch_agent_active=1
    log "launchctl bootout succeeded for $target"
    return 0
  fi

  launch_agent_bootout="bootout-failed"
  warn "failed to bootout $target (continuing force kill)"
  return 1
}

restart_launch_agent(){
  if [[ $RESTART -eq 0 ]]; then
    launch_agent_restart="not-requested"
    return 0
  fi
  if [[ $previous_launch_agent_active -eq 0 ]]; then
    launch_agent_restart="not-needed"
    return 0
  fi
  if ! command -v launchctl >/dev/null 2>&1; then
    launch_agent_restart="launchctl-missing"
    warn "launchctl not available; cannot restart LaunchAgent"
    return 1
  fi
  if [[ ! -f "$LAUNCH_AGENT_PLIST" ]]; then
    launch_agent_restart="plist-missing"
    warn "LaunchAgent plist not found at $LAUNCH_AGENT_PLIST"
    return 1
  fi

  local target="$LAUNCHCTL_DOMAIN/$LAUNCH_AGENT_LABEL"
  if launchctl bootstrap "$LAUNCHCTL_DOMAIN" "$LAUNCH_AGENT_PLIST" >/dev/null 2>&1; then
    launch_agent_restart="bootstrapped"
    log "launchctl bootstrap reloaded $target"
    if launchctl kickstart -k "$target" >/dev/null 2>&1; then
      launch_agent_restart="kickstarted"
      log "launchctl kickstart issued for $target"
      return 0
    fi
    warn "launchctl kickstart failed for $target"
    return 1
  fi

  launch_agent_restart="bootstrap-failed"
  warn "launchctl bootstrap failed for $target"
  return 1
}
usage(){
  cat <<'EOF'
guard_port_3024.sh [--force] [--json]
guard_port_3024.sh [--force] [--json] [--restart]
  --force                 Terminate blocking processes instead of exiting with failure
  --json                  Emit JSON summary instead of human log
  --restart               After clearing, restart LaunchAgent if it previously owned the port
  --label=<name>          Override LaunchAgent label (default: com.cortexos.mcp.server)
  --domain=<scope>        Override launchctl domain (default: gui/$(id -u))
  --plist=<path>          Override LaunchAgent plist path (default: ~/Library/LaunchAgents/<label>.plist)
}

for arg in "$@"; do
custom_plist=""

  case "$arg" in
    --force) FORCE=1 ;;
    --force) FORCE=1 ;;
    --json) JSON=1 ;;
    --restart) RESTART=1 ;;
    --label=*) LAUNCH_AGENT_LABEL="${arg#*=}" ;;
    --domain=*) LAUNCHCTL_DOMAIN="${arg#*=}" ;;
    --plist=*) custom_plist="${arg#*=}" ;;
    *) echo "[brAInwav guard] unknown option: $arg" >&2; usage; exit 1 ;;
  esac
done


set_launch_agent_plist
pids=$(lsof -ti tcp@${HOST}:${PORT} || true)

if [[ -z "$pids" ]]; then
  if [[ $JSON -eq 1 ]]; then
    printf '{"brand":"brAInwav","port":%d,"status":"ok","action":"none"}\n' "$PORT"
    printf '{"brand":"brAInwav","port":%d,"status":"ok","action":"none","launchAgent":{"label":"%s","domain":"%s","bootout":"not-required","restart":"not-requested"}}\n' \
      "$PORT" "$LAUNCH_AGENT_LABEL" "$LAUNCHCTL_DOMAIN"
    echo "[brAInwav guard] port $PORT is free"
    log "port $PORT is free"
  exit 0
fi

if [[ $FORCE -ne 1 ]]; then
ensure_launch_agent_bootout || true

  if [[ $JSON -eq 1 ]]; then
    printf '{"brand":"brAInwav","port":%d,"status":"blocked","pids":"%s"}\n' "$PORT" "$pids"
    printf '{"brand":"brAInwav","port":%d,"status":"blocked","pids":"%s","launchAgent":{"label":"%s","domain":"%s","bootout":"%s","restart":"not-requested"}}\n' \
      "$PORT" "$pids" "$LAUNCH_AGENT_LABEL" "$LAUNCHCTL_DOMAIN" "$launch_agent_bootout"
    echo "[brAInwav guard] port $PORT blocked by PIDs: $pids" >&2
    error "port $PORT blocked by PIDs: $pids"
  exit 127
fi

kill_output=""
for pid in $pids; do
  if kill "$pid" 2>/dev/null; then
    kill_output+="$pid "
  fi
done
sleep 1

still_blocked=$(lsof -ti tcp@${HOST}:${PORT} || true)
if [[ -n "$still_blocked" ]]; then
  if [[ $JSON -eq 1 ]]; then
    printf '{"brand":"brAInwav","port":%d,"status":"blocked","pids":"%s","forceAttempt":"failed"}\n' "$PORT" "$still_blocked"
    printf '{"brand":"brAInwav","port":%d,"status":"blocked","pids":"%s","forceAttempt":"failed","launchAgent":{"label":"%s","domain":"%s","bootout":"%s","restart":"not-requested"}}\n' \
      "$PORT" "$still_blocked" "$LAUNCH_AGENT_LABEL" "$LAUNCHCTL_DOMAIN" "$launch_agent_bootout"
    echo "[brAInwav guard] still blocked by: $still_blocked" >&2
    error "still blocked by: $still_blocked"
  exit 1
fi

if [[ $JSON -eq 1 ]]; then
restart_launch_agent || true

  printf '{"brand":"brAInwav","port":%d,"status":"cleared","terminated":"%s"}\n' "$PORT" "$kill_output"
else
  printf '{"brand":"brAInwav","port":%d,"status":"cleared","terminated":"%s","launchAgent":{"label":"%s","domain":"%s","bootout":"%s","restart":"%s"}}\n' \
    "$PORT" "$terminated_trimmed" "$LAUNCH_AGENT_LABEL" "$LAUNCHCTL_DOMAIN" "$launch_agent_bootout" "$launch_agent_restart"
fi
  log "cleared port $PORT (terminated: $terminated_trimmed)"
  if [[ $launch_agent_bootout == "bootout-success" ]]; then
    log "LaunchAgent $LAUNCH_AGENT_LABEL booted out from $LAUNCHCTL_DOMAIN"
  fi
  if [[ $launch_agent_restart == "kickstarted" ]]; then
    log "LaunchAgent $LAUNCH_AGENT_LABEL restarted from $LAUNCH_AGENT_PLIST"
  fi
