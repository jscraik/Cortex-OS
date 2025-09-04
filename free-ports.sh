#!/usr/bin/env bash
# Free one or more ports using the central port registry where possible.
set -euo pipefail

PORTS_FILE="${CORTEX_OS_HOME:-$HOME/.Cortex-OS}/config/ports.env"

usage() {
  echo "Usage: $0 [all|3001 3002 ...]"
  echo "  all    -> frees GitHub app ports from ports.env (3001,3002,3003)"
  echo "  list   -> prints current listeners for 3000-3003"
}

list_ports() {
  for p in 3000 3001 3002 3003; do
    if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then
      echo "🔒 $p in use by: $(lsof -nP -iTCP:$p -sTCP:LISTEN | awk 'NR==2{print $1" PID:"$2}')"
    else
      echo "✅ $p free"
    fi
  done
}

free_port() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids=$(lsof -t -iTCP:$port -sTCP:LISTEN || true)
    if [ -n "$pids" ]; then
      echo "⚠️  Killing listeners on $port: $pids"
      kill $pids || true
      sleep 1
      # Force kill if still alive
      pids=$(lsof -t -iTCP:$port -sTCP:LISTEN || true)
      if [ -n "$pids" ]; then
        echo "🛑 Force killing $pids on $port"
        kill -9 $pids || true
      fi
    else
      echo "✅ $port already free"
    fi
  else
    echo "lsof not available; cannot free port $port"
    return 1
  fi
}

if [ "${1:-}" = "list" ]; then
  list_ports
  exit 0
fi

declare -a target_ports
if [ "${1:-}" = "all" ]; then
  # shellcheck source=/dev/null
  . "$PORTS_FILE" 2>/dev/null || true
  target_ports=("${GITHUB_AI_PORT:-3001}" "${SEMGREP_PORT:-3002}" "${STRUCTURE_PORT:-3003}")
elif [ "$#" -ge 1 ]; then
  target_ports=("$@")
else
  usage
  exit 1
fi

for p in "${target_ports[@]}"; do
  free_port "$p"
done

echo "Done."
