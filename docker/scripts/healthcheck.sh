#!/bin/bash
# Health check script for Cortex OS Documentation container
# Checks both Nginx and the API service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NGINX_PORT=${NGINX_PORT:-80}
API_PORT=${DOCS_API_PORT:-8001}
TIMEOUT=5

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

check_nginx() {
    log "Checking Nginx service..."

    # Check if Nginx is responding
    if curl -f -s -m $TIMEOUT "http://localhost:$NGINX_PORT/health" > /dev/null; then
        log "${GREEN}✓ Nginx is healthy${NC}"
        return 0
    else
        log "${RED}✗ Nginx health check failed${NC}"
        return 1
    fi
}

check_api() {
    log "Checking API service..."

    # Check if API is responding
    if curl -f -s -m $TIMEOUT "http://localhost:$API_PORT/health" > /dev/null; then
        log "${GREEN}✓ API is healthy${NC}"
        return 0
    else
        log "${RED}✗ API health check failed${NC}"
        return 1
    fi
}

check_disk_space() {
    log "Checking disk space..."

    # Check if disk usage is below 90%
    DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -lt 90 ]; then
        log "${GREEN}✓ Disk space is adequate (${DISK_USAGE}% used)${NC}"
        return 0
    else
        log "${YELLOW}⚠ Disk space is high (${DISK_USAGE}% used)${NC}"
        return 1
    fi
}

check_memory() {
    log "Checking memory usage..."

    # Check if memory usage is below 90%
    MEMORY_USAGE=$(free | grep '^Mem:' | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ "$MEMORY_USAGE" -lt 90 ]; then
        log "${GREEN}✓ Memory usage is normal (${MEMORY_USAGE}% used)${NC}"
        return 0
    else
        log "${YELLOW}⚠ Memory usage is high (${MEMORY_USAGE}% used)${NC}"
        return 1
    fi
}

check_logs() {
    log "Checking for critical errors in logs..."

    # Check for recent critical errors in logs
    if [ -f /var/log/nginx/error.log ]; then
        RECENT_ERRORS=$(tail -n 100 /var/log/nginx/error.log | grep -c "emerg\|alert\|crit" || true)
        if [ "$RECENT_ERRORS" -eq 0 ]; then
            log "${GREEN}✓ No critical errors in Nginx logs${NC}"
        else
            log "${YELLOW}⚠ Found $RECENT_ERRORS critical errors in Nginx logs${NC}"
        fi
    fi

    if [ -f /var/log/docs-api/error.log ]; then
        RECENT_API_ERRORS=$(tail -n 100 /var/log/docs-api/error.log | grep -c "ERROR\|CRITICAL" || true)
        if [ "$RECENT_API_ERRORS" -eq 0 ]; then
            log "${GREEN}✓ No critical errors in API logs${NC}"
        else
            log "${YELLOW}⚠ Found $RECENT_API_ERRORS critical errors in API logs${NC}"
        fi
    fi
}

# Main health check
main() {
    log "Starting health check..."

    # Critical checks - if these fail, container is unhealthy
    check_nginx || exit 1
    check_api || exit 1

    # Warning checks - log warnings but don't fail
    check_disk_space || log "${YELLOW}⚠ Disk space warning${NC}"
    check_memory || log "${YELLOW}⚠ Memory usage warning${NC}"
    check_logs

    log "${GREEN}✓ All health checks passed${NC}"
    echo "healthy"
    exit 0
}

# Run health check
main "$@"
