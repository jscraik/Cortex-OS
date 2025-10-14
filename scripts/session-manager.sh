#!/bin/bash
# brAInwav Session Management Script
# Implements graceful shutdown and restart for MCP servers and development processes

set -euo pipefail

LOG_PREFIX="[brAInwav Session Manager]"

log() {
    echo "$LOG_PREFIX $(date '+%Y-%m-%d %H:%M:%S') $*" >&2
}

# Graceful shutdown sequence
graceful_shutdown() {
    local process_pattern="$1"
    local timeout="${2:-10}"
    
    log "Initiating graceful shutdown for: $process_pattern"
    
    # Find processes
    local pids
    pids=$(pgrep -f "$process_pattern" 2>/dev/null || true)
    
    if [[ -z "$pids" ]]; then
        log "No processes found matching: $process_pattern"
        return 0
    fi
    
    log "Found processes: $pids"
    
    # Send SIGTERM
    echo "$pids" | xargs -r kill -TERM
    
    # Wait for graceful exit
    local elapsed=0
    while [[ $elapsed -lt $timeout ]]; do
        local remaining
        remaining=$(echo "$pids" | xargs -r ps -p 2>/dev/null | wc -l || echo "0")
        remaining=$((remaining - 1))  # Subtract header line
        
        if [[ $remaining -eq 0 ]]; then
            log "All processes shut down gracefully"
            return 0
        fi
        
        sleep 1
        elapsed=$((elapsed + 1))
    done
    
    # Force kill if still running
    log "Timeout reached, force killing remaining processes"
    echo "$pids" | xargs -r kill -KILL 2>/dev/null || true
}

# MCP server session management
manage_mcp_sessions() {
    log "Managing MCP server sessions"
    
    # Check for stuck MCP sessions
    local stuck_mcp
    stuck_mcp=$(ps aux | grep -E "local-memory.*mcp" | awk '$10 > 600 { print $2 }' || true)
    
    if [[ -n "$stuck_mcp" ]]; then
        log "Found stuck MCP sessions (>10min): $stuck_mcp"
        graceful_shutdown "local-memory.*mcp" 15
    fi
    
    # Clean up orphaned socket files
    find /tmp -name "*.mcp.sock" -mtime +1 -delete 2>/dev/null || true
    
    log "MCP session management completed"
}

# Development process session management
manage_dev_sessions() {
    log "Managing development sessions"
    
    # Restart hanging vitest sessions
    local hanging_vitest
    hanging_vitest=$(ps aux | grep vitest | awk '$10 > 300 { print $2 }' || true)
    
    if [[ -n "$hanging_vitest" ]]; then
        log "Restarting hanging vitest sessions: $hanging_vitest"
        graceful_shutdown "vitest" 10
    fi
    
    # Clean up nx processes
    local hanging_nx
    hanging_nx=$(ps aux | grep "nx run" | awk '$10 > 600 { print $2 }' || true)
    
    if [[ -n "$hanging_nx" ]]; then
        log "Cleaning up long-running nx processes: $hanging_nx"
        graceful_shutdown "nx run" 15
    fi
    
    log "Development session management completed"
}

# Auto-restart with health checks
auto_restart_with_health_check() {
    local service_name="$1"
    local health_check_cmd="$2"
    local restart_cmd="$3"
    
    log "Performing health check for: $service_name"
    
    if ! eval "$health_check_cmd" >/dev/null 2>&1; then
        log "Health check failed for $service_name, restarting..."
        
        # Stop existing service
        graceful_shutdown "$service_name" 10
        
        # Wait a moment
        sleep 2
        
        # Restart service
        log "Restarting $service_name: $restart_cmd"
        eval "$restart_cmd" &
        
        # Verify restart
        sleep 5
        if eval "$health_check_cmd" >/dev/null 2>&1; then
            log "$service_name restarted successfully"
        else
            log "Failed to restart $service_name"
            return 1
        fi
    else
        log "$service_name health check passed"
    fi
}

# Implement process monitoring with auto-restart
setup_process_monitoring() {
    log "Setting up process monitoring with auto-restart"
    
    # MCP local-memory health check
    auto_restart_with_health_check \
        "local-memory" \
        "curl -s http://localhost:3026/health" \
        "cd /Users/jamiecraik/.Cortex-OS && pnpm mcp:local-memory:start"
    
    # Memory API health check  
    auto_restart_with_health_check \
        "memory-rest-api" \
        "curl -s http://localhost:3028/api/v1/health" \
        "cd /Users/jamiecraik/.Cortex-OS && pnpm memory:api:start"
    
    log "Process monitoring setup completed"
}

# Main execution
main() {
    case "${1:-monitor}" in
        "shutdown")
            log "Performing graceful shutdown of all sessions"
            graceful_shutdown "vitest" 10
            graceful_shutdown "nx" 15
            graceful_shutdown "tsc" 10
            graceful_shutdown "local-memory.*mcp" 15
            ;;
        "restart-mcp")
            log "Restarting MCP servers"
            manage_mcp_sessions
            setup_process_monitoring
            ;;
        "restart-dev")
            log "Restarting development processes"
            manage_dev_sessions
            ;;
        "monitor")
            log "Running full session monitoring"
            manage_mcp_sessions
            manage_dev_sessions
            setup_process_monitoring
            ;;
        *)
            echo "Usage: $0 {monitor|shutdown|restart-mcp|restart-dev}"
            echo "  monitor      - Full monitoring and auto-restart (default)"
            echo "  shutdown     - Graceful shutdown of all sessions"
            echo "  restart-mcp  - Restart MCP servers with health checks"
            echo "  restart-dev  - Restart development processes"
            exit 1
            ;;
    esac
}

main "$@"