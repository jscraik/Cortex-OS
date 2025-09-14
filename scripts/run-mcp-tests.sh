#!/bin/bash
# Script to run MCP package tests with memory constraints
# Usage: ./run-mcp-tests.sh [package-name]

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly LOG_FILE="${HOME}/.cortex-mcp-tests.log"

log_info() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $*"
    echo "$msg" | tee -a "$LOG_FILE"
}

log_error() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*"
    echo "$msg" | tee -a "$LOG_FILE" >&2
}

# Function to run tests with memory constraints
run_tests_with_constraints() {
    local package_name="$1"
    local package_path="$PROJECT_ROOT/packages/$package_name"
    
    if [[ ! -d "$package_path" ]]; then
        log_error "Package directory not found: $package_path"
        return 1
    fi
    
    log_info "Running tests for $package_name with memory constraints"
    
    cd "$package_path"
    
    case "$package_name" in
        "mcp-core"|"mcp-registry")
            # Run Node.js tests with memory constraints
            NODE_OPTIONS="--max-old-space-size=2048" \
            npx vitest run --config vitest.config.ts
            ;;
        "mcp-bridge"|"mcp")
            # Run Python tests
            python -m pytest tests/ -v
            ;;
        *)
            log_error "Unknown MCP package: $package_name"
            return 1
            ;;
    esac
}

# Function to run tests with coverage
run_tests_with_coverage() {
    local package_name="$1"
    local package_path="$PROJECT_ROOT/packages/$package_name"
    
    if [[ ! -d "$package_path" ]]; then
        log_error "Package directory not found: $package_path"
        return 1
    fi
    
    log_info "Running tests with coverage for $package_name"
    
    cd "$package_path"
    
    case "$package_name" in
        "mcp-core"|"mcp-registry")
            # Run Node.js tests with coverage and memory constraints
            NODE_OPTIONS="--max-old-space-size=2048" \
            npx vitest run --config vitest.config.ts --coverage
            ;;
        "mcp-bridge"|"mcp")
            # Run Python tests with coverage
            python -m pytest tests/ -v --cov
            ;;
        *)
            log_error "Unknown MCP package: $package_name"
            return 1
            ;;
    esac
}

main() {
    local package_name="${1:-all}"
    local run_coverage="${2:-false}"
    
    log_info "Starting MCP tests execution"
    
    case "$package_name" in
        "all")
            local packages=("mcp-core" "mcp-registry" "mcp-bridge")
            for pkg in "${packages[@]}"; do
                if [[ "$run_coverage" == "true" ]]; then
                    run_tests_with_coverage "$pkg"
                else
                    run_tests_with_constraints "$pkg"
                fi
            done
            ;;
        *)
            if [[ "$run_coverage" == "true" ]]; then
                run_tests_with_coverage "$package_name"
            else
                run_tests_with_constraints "$package_name"
            fi
            ;;
    esac
    
    log_info "MCP tests execution completed"
}

# Execute main function
main "$@"
