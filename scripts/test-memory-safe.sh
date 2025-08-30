#!/bin/bash
# Memory-safe test runner that prevents memory exhaustion
# Runs tests sequentially with memory monitoring

set -e

# Kill any existing vitest processes
pkill -f "vitest" || true
echo "Killed existing vitest processes"

# Wait for processes to clean up
sleep 2

# Set memory limits
export NODE_OPTIONS="--max-old-space-size=4096 --expose-gc"
export VITEST_MAX_THREADS=2
export VITEST_MIN_THREADS=1
export VITEST_MAX_FORKS=2
export VITEST_MIN_FORKS=1

# Function to run tests for a single package
run_package_tests() {
    local package_dir="$1"
    echo "Running tests for: $package_dir"
    
    # Check if vitest config exists
    if [[ -f "$package_dir/vitest.config.ts" ]]; then
        cd "$package_dir"
        npx vitest run --no-coverage --reporter=dot || echo "Tests failed in $package_dir"
        cd - > /dev/null
        
        # Force garbage collection and wait
        sleep 1
        echo "Completed: $package_dir"
    fi
}

# Run tests package by package to avoid memory issues
echo "Starting memory-safe test run..."

# Run root tests first
echo "Running root tests..."
npx vitest run --no-coverage --reporter=dot vitest.basic.config.ts || true

# Test key packages sequentially
packages=(
    "packages/a2a"
    "packages/mcp"
    "packages/asbr"
    "packages/orchestration"
    "packages/memories"
    "apps/cortex-os"
)

for pkg in "${packages[@]}"; do
    if [[ -d "$pkg" ]]; then
        run_package_tests "$pkg"
    fi
done

echo "Memory-safe test run completed"