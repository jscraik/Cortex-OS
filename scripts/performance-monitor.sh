#!/bin/bash

# brAInwav Performance Monitoring Script
# Provides automated performance monitoring and optimization

set -euo pipefail

echo "🚀 brAInwav Performance Monitor Starting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CHECK_INTERVAL=${BRAINWAV_MONITOR_INTERVAL:-300}  # 5 minutes default
CACHE_THRESHOLD=${BRAINWAV_CACHE_THRESHOLD:-80}   # 80% cache utilization threshold
LOG_FILE=${BRAINWAV_LOG_FILE:-"logs/performance-monitor.log"}

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function with brAInwav context
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "[$timestamp] [brAInwav] [$level] $message" | tee -a "$LOG_FILE"
}

# Check system health
check_system_health() {
    log "INFO" "Performing system health check..."
    
    # Memory usage
    local memory_usage=$(node -e "
        const usage = process.memoryUsage();
        const totalMB = Math.round(usage.rss / 1024 / 1024);
        const heapMB = Math.round(usage.heapUsed / 1024 / 1024);
        console.log(JSON.stringify({totalMB, heapMB}));
    ")
    
    log "INFO" "Memory usage: $memory_usage"
    
    # Disk space
    local disk_usage=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        log "WARN" "Disk usage high: ${disk_usage}%"
    else
        log "INFO" "Disk usage: ${disk_usage}%"
    fi
    
    # Process count
    local process_count=$(ps aux | grep -E "(node|cortex)" | grep -v grep | wc -l)
    log "INFO" "Active processes: $process_count"
}

# Cache management
manage_cache() {
    log "INFO" "Checking Nx cache..."
    
    if [ -d ".nx/cache" ]; then
        local cache_size=$(du -sm .nx/cache 2>/dev/null | cut -f1 || echo "0")
        local cache_files=$(find .nx/cache -type f 2>/dev/null | wc -l || echo "0")
        
        log "INFO" "Cache size: ${cache_size}MB, Files: $cache_files"
        
        # Check if cache needs cleanup
        if [ "$cache_size" -gt 5000 ]; then  # > 5GB
            log "WARN" "Cache size exceeds 5GB, performing cleanup..."
            
            if command -v node >/dev/null; then
                node scripts/ops-cli.mjs cache clean --force 2>&1 | tee -a "$LOG_FILE" || {
                    log "ERROR" "Cache cleanup failed, trying nx reset..."
                    npx nx reset 2>&1 | tee -a "$LOG_FILE" || log "ERROR" "Nx reset failed"
                }
            else
                log "WARN" "Node.js not available, skipping cache cleanup"
            fi
        fi
    else
        log "INFO" "No Nx cache found"
    fi
}

# Process cleanup
cleanup_processes() {
    log "INFO" "Checking for defunct processes..."
    
    # Find zombie processes
    local zombies=$(ps aux | awk '$8 ~ /^[Zz]/ { print $2 }' | wc -l)
    if [ "$zombies" -gt 0 ]; then
        log "WARN" "Found $zombies zombie processes"
        
        # Try to clean up zombies (they should be reaped by parent)
        ps aux | awk '$8 ~ /^[Zz]/ { print $2 }' | while read pid; do
            log "INFO" "Attempting to clean zombie process: $pid"
            kill -0 "$pid" 2>/dev/null || log "INFO" "Zombie process $pid already cleaned"
        done
    fi
    
    # Check for high memory Node processes
    ps aux | grep node | grep -v grep | while read -r line; do
        local memory=$(echo "$line" | awk '{print $4}')
        local pid=$(echo "$line" | awk '{print $2}')
        local cmd=$(echo "$line" | awk '{for(i=11;i<=NF;i++) printf "%s ", $i; print ""}')
        
        # Alert on processes using >1GB memory
        if (( $(echo "$memory > 10.0" | bc -l 2>/dev/null || echo "0") )); then
            log "WARN" "High memory Node process: PID=$pid, MEM=${memory}%, CMD=$cmd"
        fi
    done 2>/dev/null || true
}

# Network cleanup
cleanup_network() {
    log "INFO" "Checking network connections..."
    
    # Count active connections
    local connections=$(netstat -an 2>/dev/null | grep ESTABLISHED | wc -l || echo "0")
    log "INFO" "Active network connections: $connections"
    
    # Check for processes listening on expected ports
    local expected_ports=(3024 3026 3028 7439 7645)
    for port in "${expected_ports[@]}"; do
        if lsof -ti:$port >/dev/null 2>&1; then
            log "INFO" "Port $port is active"
        else
            log "INFO" "Port $port is not in use"
        fi
    done 2>/dev/null || log "WARN" "lsof not available for port checking"
}

# Performance optimization
optimize_performance() {
    log "INFO" "Running performance optimization..."
    
    # Node.js garbage collection suggestion
    if [ -n "${NODE_OPTIONS:-}" ]; then
        log "INFO" "NODE_OPTIONS: $NODE_OPTIONS"
    else
        log "INFO" "Suggestion: Set NODE_OPTIONS='--max-old-space-size=4096' for large workloads"
    fi
    
    # Check pnpm store
    if command -v pnpm >/dev/null; then
        local store_size=$(pnpm store path 2>/dev/null | xargs du -sm 2>/dev/null | cut -f1 || echo "0")
        log "INFO" "pnpm store size: ${store_size}MB"
        
        if [ "$store_size" -gt 10000 ]; then  # > 10GB
            log "WARN" "pnpm store is large (${store_size}MB), consider: pnpm store prune"
        fi
    fi
}

# Main monitoring loop
main() {
    log "INFO" "brAInwav Performance Monitor started (PID: $$)"
    log "INFO" "Check interval: ${CHECK_INTERVAL}s, Cache threshold: ${CACHE_THRESHOLD}%"
    
    while true; do
        echo -e "${BLUE}[brAInwav]${NC} Performance check at $(date)"
        
        check_system_health
        manage_cache
        cleanup_processes
        cleanup_network
        optimize_performance
        
        echo -e "${GREEN}[brAInwav]${NC} Check complete, next check in ${CHECK_INTERVAL}s"
        echo "----------------------------------------"
        
        sleep "$CHECK_INTERVAL"
    done
}

# Signal handlers for graceful shutdown
cleanup_and_exit() {
    log "INFO" "Received shutdown signal, cleaning up..."
    log "INFO" "brAInwav Performance Monitor stopped"
    exit 0
}

trap cleanup_and_exit SIGTERM SIGINT

# Start monitoring if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main
fi