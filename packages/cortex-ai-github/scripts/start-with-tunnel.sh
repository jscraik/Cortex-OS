#!/bin/bash
set -euo pipefail

echo "Starting cortex-ai-github server and verifying Cloudflare Tunnel..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load .env if present
if [ -f "$PKG_DIR/.env" ]; then
  set -a
  source "$PKG_DIR/.env"
  set +a
fi

PORT="${PORT:-3001}"

echo "1) Starting server on port $PORT..."
cd "$PKG_DIR"

if command -v docker >/dev/null 2>&1 && [ -n "${USE_DOCKER:-}" ]; then
  docker rm -f cortex-ai-github >/dev/null 2>&1 || true
  docker build -t cortex-ai-github .
  docker run -d --name cortex-ai-github -p "$PORT:$PORT" --env-file .env cortex-ai-github
else
  if ! command -v pnpm >/dev/null 2>&1; then
    corepack enable
    corepack use pnpm@8
  fi
  pnpm install || true
  pnpm build
  NODE_ENV=production PORT="$PORT" pnpm start &
  APP_PID=$!
fi

sleep 2

echo "2) Verifying local health..."
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/health" | grep -q "200"; then
  echo "✓ Server healthy on localhost:$PORT"
else
  echo "✗ Server did not respond OK on /health" >&2
  exit 1
fi

CF_HOSTNAME="${CF_HOSTNAME:-cortex-github.brainwav.io}"

echo "3) Verifying Cloudflare Tunnel at https://$CF_HOSTNAME/health (if reachable)..."
curl -s -o /dev/null -w "%{http_code}\n" "https://$CF_HOSTNAME/health" || true

echo "Done. Point your GitHub App Webhook URL to https://$CF_HOSTNAME/webhook"

if [ -n "${APP_PID:-}" ]; then
  wait $APP_PID
fi
