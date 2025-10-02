#!/bin/bash
# dev-setup-poststart.sh - Post-start setup for DevContainer

set -euo pipefail

echo "[brAInwav] 🚀 Running post-start setup..."

cd /opt/cortex-home

LOCAL_MEMORY_PORT="${LOCAL_MEMORY_PORT:-3028}"
LOCAL_MEMORY_MODE="${LOCAL_MEMORY_MODE:-dual}"
LOCAL_MEMORY_BIN="${LOCAL_MEMORY_BIN:-$(command -v local-memory || true)}"
LOCAL_MEMORY_LOG="/tmp/local-memory.log"

start_local_memory() {
    if [ -z "$LOCAL_MEMORY_BIN" ]; then
        echo "[brAInwav] ⚠️ Local Memory binary not found (set LOCAL_MEMORY_BIN)"
        return
    fi

    if pgrep -f "local-memory start-server" >/dev/null 2>&1; then
        echo "[brAInwav] ℹ️ Local Memory already running"
        return
    fi

    export LOCAL_MEMORY_PORT
    export LOCAL_MEMORY_MODE
    export QDRANT_URL="${QDRANT_URL:-http://qdrant:6333}"
    export LOCAL_MEMORY_BASE_URL="${LOCAL_MEMORY_BASE_URL:-http://localhost:${LOCAL_MEMORY_PORT}/api/v1}"
    export MEMORIES_SHORT_STORE="${MEMORIES_SHORT_STORE:-local}"
    export MEMORIES_ADAPTER="${MEMORIES_ADAPTER:-local}"

    echo "[brAInwav] 🚀 Starting Local Memory (mode: ${LOCAL_MEMORY_MODE}, port: ${LOCAL_MEMORY_PORT})..."
    nohup "$LOCAL_MEMORY_BIN" start-server >"$LOCAL_MEMORY_LOG" 2>&1 &
    sleep 2

    if pgrep -f "local-memory start-server" >/dev/null 2>&1; then
        echo "[brAInwav] ✅ Local Memory process launched"
    else
        echo "[brAInwav] ⚠️ Local Memory failed to start (see $LOCAL_MEMORY_LOG)"
    fi
}

local_memory_healthcheck() {
    local health_endpoints=(
        "http://localhost:${LOCAL_MEMORY_PORT}/api/v1/health"
        "http://localhost:${LOCAL_MEMORY_PORT}/healthz"
    )

    for endpoint in "${health_endpoints[@]}"; do
        if curl -fsS "$endpoint" &>/dev/null; then
            echo "[brAInwav] ✅ Local Memory is running"
            return 0
        fi
    done

    echo "[brAInwav] ⚠️ Local Memory not available (check ${LOCAL_MEMORY_LOG})"
    return 1
}

# Do not auto-start heavy services by default; allow opt-in
if [ "${CORTEX_DEV_FULL:-0}" = "1" ] && command -v docker-compose &> /dev/null; then
    if ! docker ps | grep -q qdrant; then
            echo "[brAInwav] Starting Qdrant (full mode)..."
            docker-compose -f docker/memory-stack/docker-compose.new.yml up -d qdrant || true
    fi
else
    echo "[brAInwav] Skipping service auto-start (set CORTEX_DEV_FULL=1 to enable)"
fi

start_local_memory

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
local_memory_healthcheck || true

echo ""
echo "[brAInwav] To start development:"
echo "  pnpm dev        # Start all services"
echo "  pnpm test       # Run tests"
echo "  pnpm lint       # Lint code"
