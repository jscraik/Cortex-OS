#!/usr/bin/env bash
# Hook Utilities - Shared functions for git hooks
# Source this file in hooks: . "$(dirname -- "$0")/hook-utils.sh"

set -euo pipefail

# Cache directory for hook operations
HOOK_CACHE_DIR=".git/.hook-cache"

# Colors for consistent output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_ok() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Initialize cache directory
init_cache() {
    mkdir -p "$HOOK_CACHE_DIR"
}

# Generate cache key for a set of files
generate_cache_key() {
    local files="$1"
    local operation="${2:-lint}"
    
    # Create a hash based on file paths and their modification times
    local cache_input=""
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            local mtime
            mtime=$(stat -f "%m" "$file" 2>/dev/null || stat -c "%Y" "$file" 2>/dev/null || echo "0")
            cache_input="${cache_input}${file}:${mtime}\n"
        fi
    done <<< "$files"
    
    # Generate a short hash for the cache key
    echo "${cache_input}" | shasum -a 256 2>/dev/null | cut -c1-16 || echo "no-cache"
}

# Check if cache entry is valid
is_cache_valid() {
    local cache_key="$1"
    local operation="${2:-lint}"
    local cache_file="${HOOK_CACHE_DIR}/${operation}-${cache_key}"
    
    [ -f "$cache_file" ] && [ -s "$cache_file" ]
}

# Get cached result
get_cached_result() {
    local cache_key="$1"
    local operation="${2:-lint}"
    local cache_file="${HOOK_CACHE_DIR}/${operation}-${cache_key}"
    
    if [ -f "$cache_file" ]; then
        cat "$cache_file"
        return 0
    else
        return 1
    fi
}

# Store result in cache
cache_result() {
    local cache_key="$1"
    local result="$2"
    local operation="${3:-lint}"
    local cache_file="${HOOK_CACHE_DIR}/${operation}-${cache_key}"
    
    init_cache
    echo "$result" > "$cache_file"
}

# Clean old cache entries (older than 7 days)
cleanup_cache() {
    if [ -d "$HOOK_CACHE_DIR" ]; then
        find "$HOOK_CACHE_DIR" -type f -mtime +7 -delete 2>/dev/null || true
    fi
}

# Get files changed in a git range
get_changed_files() {
    local range="${1:-HEAD~1..HEAD}"
    git diff --name-only "$range" 2>/dev/null || true
}

# Get staged files
get_staged_files() {
    git diff --cached --name-only --diff-filter=ACMR 2>/dev/null || true
}

# Filter files by extension
filter_files_by_extension() {
    local files="$1"
    local pattern="$2"
    
    if [ -n "$files" ]; then
        echo "$files" | grep -E "$pattern" || true
    fi
}

# Check if command exists with timeout
command_exists_timeout() {
    local cmd="$1"
    local timeout_sec="${2:-5}"
    
    if command -v timeout >/dev/null 2>&1; then
        timeout "$timeout_sec" command -v "$cmd" >/dev/null 2>&1
    elif command -v gtimeout >/dev/null 2>&1; then
        gtimeout "$timeout_sec" command -v "$cmd" >/dev/null 2>&1
    else
        command -v "$cmd" >/dev/null 2>&1
    fi
}

# Run command with caching
run_with_cache() {
    local cache_key="$1"
    local operation="$2"
    shift 2
    local cmd=("$@")
    
    init_cache
    
    # Check cache first
    if is_cache_valid "$cache_key" "$operation"; then
        log_info "Using cached result for $operation"
        local cached_result
        cached_result=$(get_cached_result "$cache_key" "$operation")
        if [ "$cached_result" = "success" ]; then
            return 0
        else
            return 1
        fi
    fi
    
    # Run command and cache result
    local result="failure"
    if "${cmd[@]}"; then
        result="success"
        cache_result "$cache_key" "$result" "$operation"
        return 0
    else
        cache_result "$cache_key" "$result" "$operation"
        return 1
    fi
}

# Smart lint with caching for staged files
smart_lint_staged() {
    local staged_files
    staged_files=$(get_staged_files)
    
    if [ -z "$staged_files" ]; then
        log_info "No staged files to lint"
        return 0
    fi
    
    # Filter for JS/TS files
    local js_ts_files
    js_ts_files=$(filter_files_by_extension "$staged_files" '\.(js|jsx|ts|tsx)$')
    
    if [ -z "$js_ts_files" ]; then
        log_info "No JS/TS files staged"
        return 0
    fi
    
    local cache_key
    cache_key=$(generate_cache_key "$js_ts_files" "lint-staged")
    
    log_info "Linting staged JS/TS files (cache key: ${cache_key})"
    
    # Use lint-staged with caching
    if run_with_cache "$cache_key" "lint-staged" npx --no-install lint-staged; then
        log_ok "Staged file linting passed"
        return 0
    else
        log_error "Staged file linting failed"
        return 1
    fi
}

# Smart affected test runner
smart_test_affected() {
    local changed_files="$1"
    local timeout_seconds="${2:-600}"
    
    if [ -z "$changed_files" ]; then
        log_info "No changed files - skipping tests"
        return 0
    fi
    
    # Check if code files changed
    local code_files
    code_files=$(filter_files_by_extension "$changed_files" '\.(js|jsx|ts|tsx|py|rs)$')
    
    if [ -z "$code_files" ]; then
        log_info "No code files changed - skipping tests"
        return 0
    fi
    
    local cache_key
    cache_key=$(generate_cache_key "$code_files" "test")
    
    log_info "Running affected tests (cache key: ${cache_key})"
    
    # Run tests with timeout and caching
    local test_cmd=("pnpm" "test:smart" "--" "--passWithNoTests" "--coverage.enabled=false")
    
    if command_exists_timeout "timeout"; then
        if run_with_cache "$cache_key" "test" timeout "$timeout_seconds" "${test_cmd[@]}"; then
            log_ok "Affected tests passed"
            return 0
        else
            log_error "Affected tests failed"
            return 1
        fi
    else
        if run_with_cache "$cache_key" "test" "${test_cmd[@]}"; then
            log_ok "Affected tests passed"
            return 0
        else
            log_error "Affected tests failed"
            return 1
        fi
    fi
}

# Performance timing utilities
start_timer() {
    local timer_name="${1:-default}"
    local start_time
    start_time=$(date +%s)
    echo "$start_time" > "/tmp/hook-timer-${timer_name}"
}

end_timer() {
    local timer_name="${1:-default}"
    local timer_file="/tmp/hook-timer-${timer_name}"
    
    if [ -f "$timer_file" ]; then
        local start_time end_time duration
        start_time=$(cat "$timer_file")
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        
        rm -f "$timer_file"
        echo "$duration"
    else
        echo "0"
    fi
}

# Report performance metrics
report_performance() {
    local operation="$1"
    local duration="$2"
    
    if [ "$duration" -gt 30 ]; then
        log_warn "$operation took ${duration}s (consider optimization)"
    elif [ "$duration" -gt 10 ]; then
        log_info "$operation took ${duration}s"
    else
        log_ok "$operation completed in ${duration}s"
    fi
}

# Cleanup function to be called at the end of hooks
cleanup_hook_utils() {
    # Clean old cache entries
    cleanup_cache
    
    # Remove temporary timer files
    rm -f /tmp/hook-timer-* 2>/dev/null || true
}

# Emergency bypass check
check_bypass_flags() {
    local hook_type="$1"
    
    case "$hook_type" in
        "pre-commit")
            if [ "${CORTEX_SKIP_PRECOMMIT:-}" = "1" ]; then
                log_warn "CORTEX_SKIP_PRECOMMIT=1 - skipping all pre-commit checks"
                exit 0
            fi
            ;;
        "pre-push")
            if [ "${CORTEX_SKIP_PREPUSH:-}" = "1" ]; then
                log_warn "CORTEX_SKIP_PREPUSH=1 - skipping all pre-push checks"
                exit 0
            fi
            ;;
    esac
}

# Validate tool availability
ensure_tool() {
    local tool="$1"
    local install_hint="${2:-}"
    
    if ! command_exists_timeout "$tool"; then
        log_error "$tool is required but not available"
        if [ -n "$install_hint" ]; then
            log_info "Install hint: $install_hint"
        fi
        return 1
    fi
    return 0
}

# Safe file count for performance decisions
count_files_safe() {
    local files="$1"
    local max_count="${2:-1000}"
    
    if [ -z "$files" ]; then
        echo "0"
        return
    fi
    
    local count
    count=$(echo "$files" | wc -l | tr -d ' ')
    
    # Cap at max_count for performance decisions
    if [ "$count" -gt "$max_count" ]; then
        echo "$max_count"
    else
        echo "$count"
    fi
}

# Initialize hook utilities (call this early in hooks)
init_hook_utils() {
    local hook_type="$1"
    
    # Cleanup old cache entries on startup
    cleanup_cache
    
    # Check bypass flags
    check_bypass_flags "$hook_type"
    
    # Start overall timer
    start_timer "overall"
}
