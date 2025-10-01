#!/bin/bash
# dev-setup-poststart.sh - Post-start setup for DevContainer

set -euo pipefail

echo "[brAInwav] 🚀 Running post-start setup..."

cd /opt/cortex-home

# Do not auto-start heavy services by default; allow opt-in
if [ "${CORTEX_DEV_FULL:-0}" = "1" ] && command -v docker-compose &> /dev/null; then
    if ! docker ps | grep -q qdrant; then
            echo "[brAInwav] Starting Qdrant (full mode)..."
            docker-compose -f docker/memory-stack/docker-compose.new.yml up -d qdrant || true
    fi
else
    echo "[brAInwav] Skipping service auto-start (set CORTEX_DEV_FULL=1 to enable)"
fi

# Show welcome message
if [ -f .devcontainer-welcome.txt ]; then
    cat .devcontainer-welcome.txt
fi

# Check if services are ready
echo ""
echo "[brAInwav] Checking service status..."
sleep 2

# Check Qdrant
if curl -fsS http://localhost:6333/collections &> /dev/null; then
    echo "[brAInwav] ✅ Qdrant is running"
else
    echo "[brAInwav] ⚠️ Qdrant not available"
fi

# Check Local Memory
if curl -fsS http://localhost:3028/healthz &> /dev/null; then
    echo "[brAInwav] ✅ Local Memory is running"
else
    echo "[brAInwav] ⚠️ Local Memory not available"
fi

echo ""
echo "[brAInwav] To start development:"
echo "  pnpm dev        # Start all services"
echo "  pnpm test       # Run tests"
echo "  pnpm lint       # Lint code"