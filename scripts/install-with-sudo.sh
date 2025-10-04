#!/bin/zsh
set -euo pipefail

echo "[sudo] Elevating privileges (one-time)..."
sudo -v
# Keep sudo alive for the duration of this script
while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "[check] Homebrew"
if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew not found. See https://brew.sh to install." >&2
  exit 1
fi

echo "[check] pnpm"
if ! command -v pnpm >/dev/null 2>&1; then
  echo "Enabling corepack (pnpm)"
  if command -v corepack >/dev/null 2>&1; then
    corepack enable || true
  else
    echo "corepack not available; install pnpm manually" >&2
  fi
fi

echo "[brew] Ensuring common tools (no sudo required by brew)"
brew update || true
brew install ffmpeg tesseract || true

echo "[node] Installing workspace dependencies"
pnpm run setup:deps

echo "[docker] Optional: start Qdrant & Neo4j (press Ctrl+C to skip)"
read -k 1 "_key?Start Qdrant+Neo4j in Docker? (y/N) "
echo
if [[ "${_key:l}" == "y" ]]; then
  if command -v docker >/dev/null 2>&1; then
    docker run -d --name cortex-qdrant -p 6333:6333 qdrant/qdrant:latest || true
    docker run -d --name cortex-neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/secret neo4j:latest || true
  else
    echo "Docker not found; skipping containers" >&2
  fi
fi

echo "[verify] pnpm run check:deps"
pnpm run check:deps || true

echo "[done] Installation complete."

