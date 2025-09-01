#!/bin/bash
# Enhanced memory management script - TDD compliant with proper error handling
# Usage: ./memory-manager.sh [--gentle|--aggressive] [--dry-run]

set -euo pipefail

# Configuration - Industrial standards with named constants
readonly GENTLE_MEMORY_THRESHOLD_KB=307200  # 300MB
readonly AGGRESSIVE_MEMORY_THRESHOLD_KB=204800  # 200MB
readonly MAX_NODE_PROCESSES=10
readonly MAX_CODE_HELPERS=5
readonly CLEANUP_WAIT_SECONDS=3
readonly FORCE_KILL_WAIT_SECONDS=2

# Logging - Following industrial logging practices
readonly LOG_FILE="${HOME}/.cortex-memory-manager.log"
readonly SCRIPT_NAME="$(basename "$0")"

log_info() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $*"
    echo "$msg" | tee -a "$LOG_FILE"
}

log_warn() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [WARN] $*"
    echo "$msg" | tee -a "$LOG_FILE" >&2
}

log_error() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*"
    echo "$msg" | tee -a "$LOG_FILE" >&2
}

# Process validation - TDD principle: validate before acting
validate_pid() {
    local pid="$1"
    [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null
}

safe_kill() {
    local signal="$1"
    local pid="$2"
    local description="${3:-process}"

    if validate_pid "$pid"; then
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "DRY RUN: Would kill $description (PID: $pid) with signal $signal"
        else
            if kill "$signal" "$pid" 2>/dev/null; then
                log_info "Successfully killed $description (PID: $pid)"
                return 0
            else
                log_warn "Failed to kill $description (PID: $pid)"
                return 1
            fi
        fi
    else
        log_warn "Invalid PID: $pid for $description"
        return 1
    fi
}

# Memory-specific process management - following single responsibility principle
cleanup_test_processes() {
    log_info "Cleaning up test processes..."

    local test_patterns=(
        "vitest.*run"
        "jest.*test"
        "node.*test"
        "pytest.*test"
    )

    for pattern in "${test_patterns[@]}"; do
        while IFS= read -r pid; do
            [[ -n "$pid" ]] && safe_kill "-15" "$pid" "test process ($pattern)"
        done < <(pgrep -f "$pattern" 2>/dev/null || true)
    done
}

cleanup_development_tools() {
    log_info "Cleaning up development tool processes..."

    # Semgrep processes (major memory consumers)
    while IFS= read -r pid; do
        [[ -n "$pid" ]] && safe_kill "-15" "$pid" "semgrep process"
    done < <(pgrep -f "semgrep" 2>/dev/null || true)

    # TypeScript servers (only in aggressive mode)
    if [[ "$MODE" == "aggressive" ]]; then
        while IFS= read -r pid; do
            [[ -n "$pid" ]] && safe_kill "-15" "$pid" "TypeScript server"
        done < <(pgrep -f "tsserver" 2>/dev/null || true)
    else
        log_info "Skipping TypeScript servers in gentle mode"
    fi
}

cleanup_excessive_node_processes() {
    local memory_threshold
    if [[ "$MODE" == "gentle" ]]; then
        memory_threshold="$GENTLE_MEMORY_THRESHOLD_KB"
    else
        memory_threshold="$AGGRESSIVE_MEMORY_THRESHOLD_KB"
    fi

    log_info "Cleaning up Node processes using more than $((memory_threshold / 1024))MB..."

    # Get Node processes with memory usage
    while IFS=$'\t' read -r pid memory_kb command; do
        if [[ "$memory_kb" -gt "$memory_threshold" ]]; then
            # Skip essential development processes in gentle mode
            if [[ "$MODE" == "gentle" ]] && echo "$command" | grep -qE "(Code Helper|Visual Studio Code|dev|server|watch)"; then
                log_info "Skipping essential process: $command (PID: $pid, ${memory_kb}KB)"
                continue
            fi

            # Skip system processes
            if echo "$command" | grep -qE "(WindowServer|loginwindow|Finder)"; then
                log_info "Skipping system process: $command (PID: $pid)"
                continue
            fi

            safe_kill "-15" "$pid" "high-memory Node process (${memory_kb}KB)"
        fi
    done < <(ps -ax -o pid,rss,command | awk '/node/ && !/awk/ {printf "%s\t%s\t", $1, $2; for(i=3;i<=NF;i++) printf "%s ", $i; print ""}' 2>/dev/null || true)
}

force_cleanup_remaining() {
    log_info "Force cleaning remaining problematic processes..."

    sleep "$CLEANUP_WAIT_SECONDS"

    local force_patterns
    if [[ "$MODE" == "gentle" ]]; then
        force_patterns=("vitest.*run" "semgrep-core" "pytest.*test" "jest.*test")
    else
        force_patterns=("vitest" "semgrep" "pytest" "jest" "playwright")
    fi

    for pattern in "${force_patterns[@]}"; do
        while IFS= read -r pid; do
            [[ -n "$pid" ]] && safe_kill "-9" "$pid" "stubborn process ($pattern)"
        done < <(pgrep -f "$pattern" 2>/dev/null || true)
    done
}

trigger_memory_cleanup() {
    log_info "Triggering Node.js garbage collection..."

    if command -v node >/dev/null 2>&1; then
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "DRY RUN: Would trigger Node.js garbage collection"
        else
            node -e "if (global.gc) global.gc();" 2>/dev/null || log_warn "Failed to trigger garbage collection"
        fi
    fi
}

show_memory_report() {
    log_info "Generating memory usage report..."

    local node_count python_count semgrep_count
    node_count=$(pgrep node 2>/dev/null | wc -l | tr -d ' ')
    python_count=$(pgrep python 2>/dev/null | wc -l | tr -d ' ')
    semgrep_count=$(pgrep -f semgrep 2>/dev/null | wc -l | tr -d ' ')

    echo "=== Memory Management Report ==="
    echo "Remaining Node processes: $node_count"
    echo "Remaining Python processes: $python_count"
    echo "Remaining semgrep processes: $semgrep_count"

    if command -v vm_stat >/dev/null 2>&1; then
        echo "Current memory pressure:"
        vm_stat | grep -E "Pages free|Pages active|Pages inactive|Pages wired down" || log_warn "Failed to get memory stats"
    fi

    echo "================================"
}

main() {
    # Parse arguments - following POSIX standards
    MODE="gentle"
    DRY_RUN="false"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --gentle)
                MODE="gentle"
                shift
                ;;
            --aggressive)
                MODE="aggressive"
                shift
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --help|-h)
                echo "Usage: $SCRIPT_NAME [--gentle|--aggressive] [--dry-run]"
                echo "  --gentle      Preserve VS Code and development processes (default)"
                echo "  --aggressive  Kill all memory-consuming processes"
                echo "  --dry-run     Show what would be done without executing"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    log_info "Starting memory management in $MODE mode${DRY_RUN:+ (DRY RUN)}"

    # Execute cleanup phases in order
    cleanup_test_processes
    cleanup_development_tools
    cleanup_excessive_node_processes
    force_cleanup_remaining
    trigger_memory_cleanup

    # Wait for cleanup to settle
    [[ "$DRY_RUN" == "false" ]] && sleep "$CLEANUP_WAIT_SECONDS"

    show_memory_report
    log_info "Memory management complete"
}

# Execute main function with all arguments
main "$@"
