#!/bin/bash
# Development server with automatic memory monitoring
# Starts your dev server while monitoring and preventing memory issues

set -euo pipefail

# Configuration
MEMORY_THRESHOLD=${MEMORY_THRESHOLD:-75}
DEV_COMMAND=${DEV_COMMAND:-"pnpm dev:turbo"}
GUARD_INTERVAL=${GUARD_INTERVAL:-15}

log() {
    echo "[$(date '+%H:%M:%S')] $*"
}

# Function to start memory guard in background
start_memory_guard() {
    log "🛡️  Starting memory guard (threshold: ${MEMORY_THRESHOLD}%)"
    bash scripts/auto-memory-guard.sh daemon &
    GUARD_PID=$!
    echo $GUARD_PID > /tmp/.cortex-memory-guard.pid
}

# Function to stop memory guard
stop_memory_guard() {
    if [ -f /tmp/.cortex-memory-guard.pid ]; then
        GUARD_PID=$(cat /tmp/.cortex-memory-guard.pid)
        kill $GUARD_PID 2>/dev/null || true
        rm -f /tmp/.cortex-memory-guard.pid
        log "🛑 Memory guard stopped"
    fi
}

# Cleanup function
cleanup() {
    log "🧹 Cleaning up..."
    stop_memory_guard
    bash scripts/kill-memory-hogs.sh 2>/dev/null || true
    exit 0
}

# Set up signal handlers
trap cleanup EXIT INT TERM

# Pre-development cleanup
log "🔄 Pre-flight memory cleanup..."
bash scripts/kill-memory-hogs.sh 2>/dev/null || true

# Start memory guard
start_memory_guard

# Start development server with memory limits
log "🚀 Starting development server with memory protection..."
exec env NODE_OPTIONS="--max-old-space-size=4096 --expose-gc" $DEV_COMMAND