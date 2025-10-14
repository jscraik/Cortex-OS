#!/bin/bash
# brAInwav Process Health Monitor
# Monitors and manages Cortex-OS processes with automatic cleanup

set -euo pipefail

# brAInwav configuration
SCRIPT_NAME="[brAInwav] Process Health Monitor"
LOG_PREFIX="[brAInwav]"
MAX_MEMORY_MB=8192
MAX_CPU_PERCENT=80
CLEANUP_INTERVAL=300  # 5 minutes

# Process patterns to monitor
declare -a MONITOR_PATTERNS=(
    "vitest"
    "nx"
    "tsc"
    "node.*mcp"
    "local-memory"
)

log() {
    echo "$LOG_PREFIX $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
}

check_process_health() {
    local pattern="$1"
    local pids
    
    # Find processes matching pattern
    pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    
    if [[ -z "$pids" ]]; then
        return 0
    fi
    
    log "Checking health for pattern: $pattern"
    
    for pid in $pids; do
        if [[ ! -d "/proc/$pid" ]]; then
            continue
        fi
        
        # Check memory usage
        local memory_kb
        memory_kb=$(ps -o rss= -p "$pid" 2>/dev/null || echo "0")
        local memory_mb=$((memory_kb / 1024))
        
        # Check CPU usage
        local cpu_percent
        cpu_percent=$(ps -o pcpu= -p "$pid" 2>/dev/null || echo "0")
        cpu_percent=${cpu_percent%.*}  # Remove decimal
        
        log "PID $pid: Memory=${memory_mb}MB, CPU=${cpu_percent}%"
        
        # Kill if exceeding limits
        if [[ $memory_mb -gt $MAX_MEMORY_MB ]] || [[ ${cpu_percent:-0} -gt $MAX_CPU_PERCENT ]]; then
            log "KILLING PID $pid (Memory: ${memory_mb}MB, CPU: ${cpu_percent}%) - Exceeded limits"
            kill -TERM "$pid" 2>/dev/null || true
            sleep 2
            kill -KILL "$pid" 2>/dev/null || true
        fi
    done
}

cleanup_defunct_processes() {
    log "Cleaning up defunct processes..."
    
    # Find and reap zombie processes
    local zombies
    zombies=$(ps aux | awk '$8 ~ /^Z/ { print $2 }' || true)
    
    if [[ -n "$zombies" ]]; then
        log "Found zombie processes: $zombies"
        # Kill parent processes that might be creating zombies
        for zombie in $zombies; do
            local parent
            parent=$(ps -o ppid= -p "$zombie" 2>/dev/null || true)
            if [[ -n "$parent" && "$parent" != "1" ]]; then
                log "Sending SIGCHLD to parent $parent of zombie $zombie"
                kill -CHLD "$parent" 2>/dev/null || true
            fi
        done
    fi
    
    # Clean up orphaned MCP servers
    local orphaned_mcp
    orphaned_mcp=$(pgrep -f "local-memory.*mcp" | while read -r pid; do
        if [[ ! -S "/proc/$pid/fd"/* ]] 2>/dev/null; then
            echo "$pid"
        fi
    done || true)
    
    if [[ -n "$orphaned_mcp" ]]; then
        log "Cleaning up orphaned MCP servers: $orphaned_mcp"
        echo "$orphaned_mcp" | xargs -r kill -TERM
    fi
}

nx_cache_cleanup() {
    local nx_cache_size
    nx_cache_size=$(du -sm .nx/cache 2>/dev/null | cut -f1 || echo "0")
    
    if [[ $nx_cache_size -gt 1024 ]]; then  # > 1GB
        log "NX cache size: ${nx_cache_size}MB - Performing cleanup"
        npx nx reset 2>/dev/null || true
        log "NX cache cleaned"
    fi
}

setup_mcp_pooling() {
    log "Setting up MCP server pooling configuration"
    
    # Create shared MCP instance configuration
    cat > /tmp/mcp-pool-config.json << 'EOF'
{
  "brAInwav_pool_config": {
    "max_instances": 3,
    "idle_timeout": 300000,
    "memory_limit_mb": 512,
    "restart_on_memory_leak": true,
    "shared_memory_cache": true
  }
}
EOF
    
    log "MCP pooling configuration created"
}

monitor_session_health() {
    log "Monitoring session health and implementing auto-restart"
    
    # Check for stuck sessions
    local stuck_sessions
    stuck_sessions=$(ps aux | grep -E "(vitest|nx|tsc)" | awk '$10 > 300 { print $2 }' || true)
    
    if [[ -n "$stuck_sessions" ]]; then
        log "Found stuck sessions (>5min runtime): $stuck_sessions"
        echo "$stuck_sessions" | xargs -r kill -TERM
        sleep 5
        echo "$stuck_sessions" | xargs -r kill -KILL 2>/dev/null || true
    fi
}

main() {
    log "Starting $SCRIPT_NAME"
    
    # Implement all requested improvements
    cleanup_defunct_processes
    setup_mcp_pooling
    nx_cache_cleanup
    monitor_session_health
    
    # Monitor processes
    for pattern in "${MONITOR_PATTERNS[@]}"; do
        check_process_health "$pattern"
    done
    
    log "Health check cycle completed"
}

# Run main function
main "$@"