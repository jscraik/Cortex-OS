#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${1:-}"
LOCAL_PORT="${2:-}"

if [[ -z "${SERVICE_NAME}" ]]; then
  echo "Usage: $0 <service-name> [local-port]"
  exit 2
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "[cloudflared:${SERVICE_NAME}] cloudflared not found. Install: brew install cloudflare/cloudflare/cloudflared"
  exit 127
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
mkdir -p logs

URL_FILE="logs/cloudflared-${SERVICE_NAME}.url"
LOG_FILE="logs/cloudflared-${SERVICE_NAME}.log"
METRICS_PORT=$(python3 - <<'PY'
import socket
def free_port():
    s=socket.socket(); s.bind(('127.0.0.1',0)); p=s.getsockname()[1]; s.close(); return p
print(free_port())
PY
)

if [[ -z "${LOCAL_PORT}" ]]; then
  # shellcheck source=/dev/null
  source config/ports.env 2>/dev/null || true
  case "${SERVICE_NAME}" in
    mcp) LOCAL_PORT="${MCP_PORT:-3000}" ;;
    github-ai) LOCAL_PORT="${GITHUB_AI_PORT:-3001}" ;;
    github-semgrep) LOCAL_PORT="${SEMGREP_PORT:-3002}" ;;
    github-structure) LOCAL_PORT="${STRUCTURE_PORT:-3003}" ;;
    *) echo "[cloudflared:${SERVICE_NAME}] Unknown service name and no port provided"; exit 2 ;;
  esac
fi

echo "[cloudflared:${SERVICE_NAME}] Exposing http://localhost:${LOCAL_PORT} (metrics 127.0.0.1:${METRICS_PORT})"

# Start a background watcher to capture the first assigned URL
(
  rm -f "$URL_FILE"
  : > "$LOG_FILE"
  tail -n +1 -F "$LOG_FILE" 2>/dev/null |
    awk '/https:\/\/.*trycloudflare\.com/ {print $1; fflush(); exit 0}' > "$URL_FILE"
) &

exec cloudflared tunnel --no-autoupdate --edge-ip-version auto --protocol http2 \
  --metrics 127.0.0.1:"${METRICS_PORT}" \
  --url "http://localhost:${LOCAL_PORT}" \
  2>&1 | tee -a "$LOG_FILE"
