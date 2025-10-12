#!/bin/bash

# brAInwav Vibe Check Monitoring Script
# Monitors Cortex-OS logs for vibe-check integration activity

set -euo pipefail

# Configuration
LOG_FILE="${LOG_FILE:-/var/log/cortex-os/cortex-os.log}"
SEARCH_PATTERN="brAInwav-vibe-check"
ALERT_THRESHOLD="${ALERT_THRESHOLD:-5}"
CHECK_INTERVAL="${CHECK_INTERVAL:-60}"
MONITOR_DURATION="${MONITOR_DURATION:-3600}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
success_count=0
failure_count=0
soft_failure_count=0
total_checks=0

echo -e "${BLUE}🔍 brAInwav Vibe Check Monitor Started${NC}"
echo -e "${BLUE}=====================================${NC}"
echo "Log File: $LOG_FILE"
echo "Search Pattern: $SEARCH_PATTERN"
echo "Check Interval: ${CHECK_INTERVAL}s"
echo "Monitor Duration: ${MONITOR_DURATION}s"
echo ""

# Function to check for vibe-check activity
check_vibe_check_activity() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local recent_logs=""

    # Get recent logs (last check interval seconds)
    if [[ -f "$LOG_FILE" ]]; then
        recent_logs=$(tail -n 1000 "$LOG_FILE" | grep "$SEARCH_PATTERN" || true)
    else
        echo -e "${YELLOW}⚠️  Log file not found: $LOG_FILE${NC}"
        return 0
    fi

    if [[ -z "$recent_logs" ]]; then
        echo -e "${YELLOW}[$timestamp] ℹ️  No vibe-check activity in last ${CHECK_INTERVAL}s${NC}"
        return 0
    fi

    # Count different types of activity
    local completed=$(echo "$recent_logs" | grep -c "brAInwav-vibe-check: completed" || true)
    local soft_failures=$(echo "$recent_logs" | grep -c "brAInwav-vibe-check: oversight call failed (soft)" || true)
    local http_errors=$(echo "$recent_logs" | grep -c "brAInwav-vibe-check: HTTP" || true)

    # Update counters
    ((success_count += completed))
    ((soft_failure_count += soft_failures))
    ((failure_count += http_errors))
    ((total_checks += completed + soft_failures + http_errors))

    # Report activity
    echo -e "${GREEN}[$timestamp] ✅ Vibe-check completed: $completed${NC}"
    if [[ $soft_failures -gt 0 ]]; then
        echo -e "${YELLOW}[$timestamp] ⚠️  Soft failures: $soft_failures${NC}"
    fi
    if [[ $http_errors -gt 0 ]]; then
        echo -e "${RED}[$timestamp] ❌ HTTP errors: $http_errors${NC}"
    fi

    # Alert if too many soft failures
    if [[ $soft_failures -gt $ALERT_THRESHOLD ]]; then
        echo -e "${RED}🚨 ALERT: High soft failure count ($soft_failures > $ALERT_THRESHOLD)${NC}"
        echo -e "${RED}   Check vibe-check server connectivity: http://127.0.0.1:2091${NC}"
    fi

    # Show recent activity details
    if [[ -n "$recent_logs" ]]; then
        echo ""
        echo "Recent activity:"
        echo "$recent_logs" | tail -5
        echo ""
    fi
}

# Function to show summary
show_summary() {
    local uptime=$(SECONDS)
    echo -e "${BLUE}📊 Monitoring Summary${NC}"
    echo -e "${BLUE}==================${NC}"
    echo "Total checks: $total_checks"
    echo -e "  Successful: ${GREEN}$success_count${NC}"
    echo -e "  Soft failures: ${YELLOW}$soft_failure_count${NC}"
    echo -e "  HTTP errors: ${RED}$failure_count${NC}"
    echo "Monitoring duration: ${uptime}s"

    if [[ $total_checks -gt 0 ]]; then
        local success_rate=$((success_count * 100 / total_checks))
        local failure_rate=$((soft_failure_count * 100 / total_checks))
        echo "Success rate: ${success_rate}%"
        echo "Soft failure rate: ${failure_rate}%"
    fi

    echo ""
    echo -e "${BLUE}🔧 Troubleshooting Commands:${NC}"
    echo "Check vibe-check server: curl -s http://127.0.0.1:2091/healthz"
    echo "View real-time logs: tail -f $LOG_FILE | grep '$SEARCH_PATTERN'"
    echo "Restart vibe-check: npx @pv-bhat/vibe-check-mcp start --http --port 2091"
}

# Trap to show summary on exit
trap 'show_summary; echo -e "${BLUE}✅ Monitor stopped${NC}"; exit 0' INT TERM

# Main monitoring loop
start_time=$(date +%s)
end_time=$((start_time + MONITOR_DURATION))

while [[ $(date +%s) -lt $end_time ]]; do
    check_vibe_check_activity
    sleep $CHECK_INTERVAL
done

# Show final summary if duration reached
show_summary
echo -e "${BLUE}⏰ Monitoring duration completed${NC}"