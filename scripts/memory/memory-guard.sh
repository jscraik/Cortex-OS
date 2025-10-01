#!/bin/bash

# Emergency Memory Surge Prevention Script
# This script prevents runaway test processes from crashing the system

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MEMORY_MONITOR="$SCRIPT_DIR/memory-monitor.sh"
PID_FILE="/tmp/cortex-memory-guard.pid"

# Function to start monitoring daemon
start_daemon() {
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo "Memory guard daemon already running (PID: $pid)"
            return 0
        else
            rm -f "$PID_FILE"
        fi
    fi

    echo "Starting memory guard daemon..."
    nohup "$MEMORY_MONITOR" daemon > /tmp/cortex-memory-guard.log 2>&1 &
    echo $! > "$PID_FILE"
    echo "Memory guard daemon started (PID: $(cat "$PID_FILE"))"
    echo "Logs: /tmp/cortex-memory-guard.log"
}

# Function to stop monitoring daemon
stop_daemon() {
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo "Stopping memory guard daemon (PID: $pid)..."
            kill "$pid"
            rm -f "$PID_FILE"
            echo "Memory guard daemon stopped"
        else
            echo "Memory guard daemon not running"
            rm -f "$PID_FILE"
        fi
    else
        echo "Memory guard daemon not running"
    fi
}

# Function to check daemon status
status_daemon() {
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo "Memory guard daemon is running (PID: $pid)"

            # Show recent log entries
            if [ -f "/tmp/cortex-memory-guard.log" ]; then
                echo "Recent activity:"
                tail -5 /tmp/cortex-memory-guard.log
            fi
        else
            echo "Memory guard daemon is not running (stale PID file)"
            rm -f "$PID_FILE"
        fi
    else
        echo "Memory guard daemon is not running"
    fi
}

# Emergency kill function
emergency_kill() {
    echo "🚨 EMERGENCY: Killing all test processes and high-memory Node.js processes"

    # Kill all test runners
    pkill -f "vitest" || true
    pkill -f "jest" || true
    pkill -f "mocha" || true
    pkill -f "pnpm test" || true
    pkill -f "npm test" || true

    # Kill high-memory Node processes (>500MB)
    ps aux | awk '/node/ && $6 > 512000 {
        printf "Killing high-memory Node process PID %s using %d MB\n", $2, int($6/1024)
        system("kill -9 " $2)
    }'

    # Kill long-running gitleaks
    pkill -f "gitleaks" || true

    echo "Emergency cleanup completed"
}

# Usage
usage() {
    echo "Cortex OS Memory Surge Prevention"
    echo ""
    echo "Usage: $0 {start|stop|status|emergency|monitor}"
    echo ""
    echo "Commands:"
    echo "  start     - Start memory monitoring daemon"
    echo "  stop      - Stop memory monitoring daemon"
    echo "  status    - Check daemon status and recent activity"
    echo "  emergency - Emergency kill of all test processes"
    echo "  monitor   - Run single memory check"
    echo ""
    echo "The daemon monitors memory usage and automatically kills runaway processes"
    echo "to prevent system crashes from memory surges."
}

# Main execution
case "${1:-}" in
    start)
        start_daemon
        ;;
    stop)
        stop_daemon
        ;;
    status)
        status_daemon
        ;;
    emergency)
        emergency_kill
        ;;
    monitor)
        "$MEMORY_MONITOR"
        ;;
    *)
        usage
        exit 1
        ;;
esac
