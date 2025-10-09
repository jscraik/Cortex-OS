#!/usr/bin/env bash

set -euo pipefail

./scripts/system/check-port-conflicts.sh

docker compose -f docker/docker-compose.unified-memory.yml up -d --build

# Health loop
for port in 3023 3028 6333; do
  until curl -s -f "http://localhost:$port/health" > /dev/null; do
    echo "Waiting for service on port $port..."
    sleep 5
  done
done

# Functional parity
# Store a doc via REST
curl -X POST -H "Content-Type: application/json" -d '{"text":"test doc"}' http://localhost:3028/v1/memory.store

# Search via MCP
# This is a placeholder for a real MCP client call
echo '{"tool":"memory.search","input":{"query":"test doc"}}' | nc localhost 3023

if [ "${PIECES_MCP_ENABLED:-false}" = "true" ]; then
  # Ping Pieces OS
  curl -s -f "http://localhost:39300/health"
fi

pnpm lint && pnpm test && pnpm security:scan && pnpm structure:validate

echo "brAInwav Unified Memory Stack Verification Complete"
