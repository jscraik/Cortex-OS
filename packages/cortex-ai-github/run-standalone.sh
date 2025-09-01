#!/bin/bash
set -euo pipefail

echo "=== Starting cortex-ai-github server (standalone) ==="

PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PKG_DIR"

# Load .env if present
if [ -f ".env" ]; then
  echo "Loading .env..."
  set -a
  source .env
  set +a
fi

# Check required env vars
: "${GITHUB_TOKEN:?GITHUB_TOKEN is required}"
: "${WEBHOOK_SECRET:?WEBHOOK_SECRET is required}"

PORT="${PORT:-3001}"

echo "Starting server on port $PORT..."
echo "Webhook URL will be: https://cortex-github.brainwav.io/webhook"

# Install and run with tsx directly (no build step needed)
if ! command -v tsx >/dev/null 2>&1; then
  echo "Installing tsx globally..."
  npm install -g tsx
fi

echo "Starting server..."
tsx src/server/start.ts
