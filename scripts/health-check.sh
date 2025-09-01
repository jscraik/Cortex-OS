#!/bin/bash
# Health check script for Cortex-OS
# Performs comprehensive health checks for the application

set -euo pipefail

# Configuration
HEALTH_ENDPOINT="${HEALTH_ENDPOINT:-http://localhost:3000/health}"
TIMEOUT="${TIMEOUT:-10}"
MAX_RETRIES="${MAX_RETRIES:-3}"
RETRY_DELAY="${RETRY_DELAY:-5}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Health check functions
check_http_endpoint() {
    local endpoint="$1"
    local retries=0

    while [ $retries -lt $MAX_RETRIES ]; do
        log_info "Checking HTTP endpoint: $endpoint (attempt $((retries + 1))/$MAX_RETRIES)"

        if curl -f -s --connect-timeout "$TIMEOUT" "$endpoint" > /dev/null; then
            log_info "✅ HTTP endpoint is healthy"
            return 0
        fi

        retries=$((retries + 1))
        if [ $retries -lt $MAX_RETRIES ]; then
            log_warn "❌ Health check failed, retrying in ${RETRY_DELAY}s..."
            sleep "$RETRY_DELAY"
        fi
    done

    log_error "❌ HTTP endpoint health check failed after $MAX_RETRIES attempts"
    return 1
}

check_process() {
    local process_name="$1"

    log_info "Checking if process '$process_name' is running..."

    if pgrep -f "$process_name" > /dev/null; then
        log_info "✅ Process '$process_name' is running"
        return 0
    else
        log_error "❌ Process '$process_name' is not running"
        return 1
    fi
}

check_port() {
    local port="$1"

    log_info "Checking if port $port is listening..."

    # Use platform-agnostic approach
    if command -v netstat >/dev/null 2>&1; then
        if netstat -an | grep ":$port " | grep LISTEN > /dev/null; then
            log_info "✅ Port $port is listening"
            return 0
        fi
    elif command -v lsof >/dev/null 2>&1; then
        if lsof -i ":$port" > /dev/null 2>&1; then
            log_info "✅ Port $port is listening"
            return 0
        fi
    elif command -v nc >/dev/null 2>&1; then
        if nc -z localhost "$port" 2>/dev/null; then
            log_info "✅ Port $port is listening"
            return 0
        fi
    else
        log_warn "⚠️ Port check skipped (no suitable command available)"
        return 0
    fi

    log_error "❌ Port $port is not listening"
    return 1
}

check_disk_space() {
    local threshold="${1:-85}"

    log_info "Checking disk space usage (threshold: ${threshold}%)..."

    local usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

    if [ "$usage" -lt "$threshold" ]; then
        log_info "✅ Disk space usage: ${usage}%"
        return 0
    else
        log_error "❌ Disk space usage too high: ${usage}% (threshold: ${threshold}%)"
        return 1
    fi
}

check_memory_usage() {
    local threshold="${1:-85}"

    log_info "Checking memory usage (threshold: ${threshold}%)..."

    # Platform-aware memory checking
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - use vm_stat for better compatibility
        if command -v vm_stat >/dev/null 2>&1; then
            local free_pages=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
            local total_pages=$(vm_stat | grep -E "(Pages free|Pages active|Pages inactive|Pages speculative|Pages wired down)" | awk '{sum += $3} END {print sum}')
            if [ -n "$free_pages" ] && [ -n "$total_pages" ] && [ "$total_pages" -gt 0 ]; then
                local usage=$(echo "scale=0; 100 - ($free_pages * 100 / $total_pages)" | bc 2>/dev/null || echo "50")
                if [ "${usage:-50}" -lt "$threshold" ]; then
                    log_info "✅ Memory usage: ${usage}%"
                    return 0
                else
                    log_error "❌ Memory usage too high: ${usage}% (threshold: ${threshold}%)"
                    return 1
                fi
            else
                log_warn "⚠️ Could not parse memory information from vm_stat"
                return 0
            fi
        else
            log_warn "⚠️ Memory check skipped (vm_stat not available)"
            return 0
        fi
    else
        # Linux/other - use free command
        if command -v free >/dev/null 2>&1; then
            local usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
            if [ "$usage" -lt "$threshold" ]; then
                log_info "✅ Memory usage: ${usage}%"
                return 0
            else
                log_error "❌ Memory usage too high: ${usage}% (threshold: ${threshold}%)"
                return 1
            fi
        else
            log_warn "⚠️ Memory check skipped (free command not available)"
            return 0
        fi
    fi
}

check_environment() {
    log_info "Checking environment variables..."

    local required_vars=("NODE_ENV")
    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -eq 0 ]; then
        log_info "✅ All required environment variables are set"
        return 0
    else
        log_error "❌ Missing environment variables: ${missing_vars[*]}"
        return 1
    fi
}

# Main health check
main() {
    local exit_code=0

    log_info "🏥 Starting Cortex-OS health check..."
    echo "======================================"

    # HTTP endpoint check
    if ! check_http_endpoint "$HEALTH_ENDPOINT"; then
        exit_code=1
    fi

    echo "--------------------------------------"

    # Process check (optional - comment out if not applicable)
    # if ! check_process "node"; then
    #     exit_code=1
    # fi

    # Port check
    if ! check_port "3000"; then
        exit_code=1
    fi

    echo "--------------------------------------"

    # System resource checks
    if ! check_disk_space "85"; then
        exit_code=1
    fi

    # Memory check (platform-aware)
    if ! check_memory_usage "85"; then
        exit_code=1
    fi

    echo "--------------------------------------"

    # Environment check
    if ! check_environment; then
        exit_code=1
    fi

    echo "======================================"

    if [ $exit_code -eq 0 ]; then
        log_info "🎉 All health checks passed!"
    else
        log_error "💥 Some health checks failed!"
    fi

    exit $exit_code
}

# Run health check
main "$@"
