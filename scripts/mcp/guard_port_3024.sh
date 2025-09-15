#!/usr/bin/env bash
set -euo pipefail

PORT=3024
MAX_WAIT=5
SLEEP=0.5

log() { echo "[guard_port_${PORT}] $*"; }
err() { echo "[guard_port_${PORT}] ERROR: $*" >&2; }

usage() {
  cat <<EOF
Usage: $0 [--dry-run] [--force] [--grace <seconds>]

Ensures no rogue process is binding to port ${PORT} before starting the MCP server.

Options:
  --dry-run        Only report processes; do not kill
  --force          Escalate to SIGKILL if SIGTERM does not free port within grace
  --grace <sec>    Seconds to wait after SIGTERM before optional SIGKILL (default: ${MAX_WAIT})
EOF
}

DRY_RUN=0
FORCE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --force) FORCE=1; shift ;;
    --grace) MAX_WAIT=${2:-$MAX_WAIT}; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) err "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

pids=$(lsof -nP -i :${PORT} -sTCP:LISTEN -t 2>/dev/null || true)
if [[ -z "$pids" ]]; then
  log "Port ${PORT} is free."
  exit 0
fi

log "Detected process(es) on ${PORT}: $pids"
if [[ $DRY_RUN -eq 1 ]]; then
  log "Dry run mode: not terminating."; exit 0
fi

for pid in $pids; do
  if [[ $pid -eq $$ ]]; then
    log "Skipping self PID $pid"
    continue
  fi
  cmdline=$(ps -o command= -p "$pid" || echo "<unknown>")
  log "Sending SIGTERM to PID $pid ($cmdline)"
  kill -15 "$pid" || err "Failed to SIGTERM $pid"

done

elapsed=0
while lsof -nP -i :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1; do
  if (( $(echo "$elapsed >= $MAX_WAIT" | bc -l) )); then
    if [[ $FORCE -eq 1 ]]; then
      log "Port still in use after ${MAX_WAIT}s; escalating to SIGKILL"
      for pid in $(lsof -nP -i :${PORT} -sTCP:LISTEN -t 2>/dev/null || true); do
        kill -9 "$pid" || err "Failed to SIGKILL $pid"
      done
      break
    else
      err "Port ${PORT} still in use after ${MAX_WAIT}s. Use --force to escalate."
      exit 2
    fi
  fi
  sleep "$SLEEP"
  elapsed=$(echo "$elapsed + $SLEEP" | bc)
  log "Waiting for port to free... ${elapsed}/${MAX_WAIT}s"
fi

if lsof -nP -i :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
  err "Failed to free port ${PORT}."; exit 3
fi

log "Port ${PORT} is now free."
