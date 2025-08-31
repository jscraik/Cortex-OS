#!/bin/bash
# Auto Memory Guard - Prevents memory exhaustion during development
# Monitors system memory and automatically kills runaway processes

set -euo pipefail

MEMORY_THRESHOLD_PERCENT=${MEMORY_THRESHOLD_PERCENT:-80}
CHECK_INTERVAL=${CHECK_INTERVAL:-10}
LOG_FILE="$HOME/.cortex-memory-guard.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

get_memory_usage() {
    # Get memory usage percentage on macOS
    vm_stat | awk '
    BEGIN { 
        total=0; used=0; free=0; active=0; inactive=0; wired=0; pagesize=0;
    }
    /Pages free:/ { free = $3 }
    /Pages active:/ { active = $3 }
    /Pages inactive:/ { inactive = $3 }
    /Pages wired down:/ { wired = $4 }
    /page size of/ { 
        pagesize = $8
        total = (free + active + inactive + wired)
        used = (active + inactive + wired)
        if (total > 0) {
            printf "%.1f", (used / total) * 100
        } else {
            printf "50.0"  # Fallback if calculation fails
        }
    }'
}

cleanup_processes() {
    log "🚨 Memory threshold exceeded - cleaning up processes"
    
    # Kill runaway vitest processes
    pkill -f "vitest.*run" 2>/dev/null || true
    pkill -f "node.*vitest" 2>/dev/null || true
    
    # Kill multiple Python processes (keep 3 newest)
    local python_count=$(pgrep -f "python" | wc -l)
    if [ "$python_count" -gt 5 ]; then
        log "🐍 Killing excess Python processes ($python_count found, keeping 3)"
        # Get oldest processes (by PID) and kill excess ones
        pgrep -f "python" | sort -n | head -n $((python_count - 3)) | xargs -r kill -TERM 2>/dev/null || true
    fi
    
    # Kill multiple Node processes except development servers (keep 5 newest)
    local node_pids=$(pgrep -f "node" | xargs -I{} sh -c 'ps -p {} -o pid,command | grep -v -E "(next|vite|dev|turbo)"' | awk '{print $1}' | grep -E '^[0-9]+$' || true)
    local node_count=$(echo "$node_pids" | wc -w)
    if [ "$node_count" -gt 8 ]; then
        log "🟢 Killing excess Node processes ($node_count found, keeping 5)"
        # Get oldest processes and kill excess ones
        echo "$node_pids" | tr ' ' '\n' | sort -n | head -n $((node_count - 5)) | xargs -r kill -TERM 2>/dev/null || true
    fi
    
    sleep 3
    
    # Force kill if still running
    pkill -9 -f "vitest.*run" 2>/dev/null || true
    
    log "✅ Process cleanup completed"
}

daemon_mode() {
    log "🔄 Starting memory guard daemon (threshold: ${MEMORY_THRESHOLD_PERCENT}%)"
    
    while true; do
        memory_usage=$(get_memory_usage)
        memory_int=${memory_usage%.*}
        
        if [ "$memory_int" -gt "$MEMORY_THRESHOLD_PERCENT" ]; then
            log "⚠️  Memory usage: ${memory_usage}% (threshold: ${MEMORY_THRESHOLD_PERCENT}%)"
            cleanup_processes
            
            # Wait longer after cleanup
            sleep 30
        else
            # Normal monitoring interval
            sleep "$CHECK_INTERVAL"
        fi
    done
}

main() {
    case "${1:-check}" in
        daemon)
            daemon_mode
            ;;
        cleanup)
            cleanup_processes
            ;;
        check)
            memory_usage=$(get_memory_usage)
            echo "Current memory usage: ${memory_usage}%"
            ;;
        *)
            echo "Usage: $0 {daemon|cleanup|check}"
            echo "  daemon  - Run continuous monitoring"
            echo "  cleanup - Clean up memory-hungry processes"
            echo "  check   - Show current memory usage"
            exit 1
            ;;
    esac
}

main "$@"