#!/bin/bash

# Performance-optimized startup script for Cortex-OS
# This script configures the environment for optimal performance

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[PERF] ${message}${NC}"
}

# Function to check if GPU is available
check_gpu_availability() {
    if command -v nvidia-smi >/dev/null 2>&1; then
        local gpu_count=$(nvidia-smi --list-gpus | wc -l)
        if [ "$gpu_count" -gt 0 ]; then
            print_status "$GREEN" "GPU detected: $gpu_count GPU(s) available"
            nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free --format=csv,noheader,nounits
            return 0
        fi
    fi

    if command -v rocm-smi >/dev/null 2>&1; then
        print_status "$GREEN" "AMD ROCm GPU detected"
        rocm-smi --showproductname
        return 0
    fi

    print_status "$YELLOW" "No GPU detected - CPU-only mode will be used"
    return 1
}

# Function to optimize system settings
optimize_system_settings() {
    print_status "$BLUE" "Optimizing system settings..."

    # Increase file descriptor limits
    if [ "$(ulimit -n)" -lt 65536 ]; then
        ulimit -n 65536 2>/dev/null || print_status "$YELLOW" "Could not increase file descriptor limit"
    fi

    # Optimize Node.js settings
    export NODE_OPTIONS="--max-old-space-size=4096 --expose-gc --optimize-for-size --max-semi-space-size=128"

    # Set performance mode for CPU if available
    if command -v cpupower >/dev/null 2>&1; then
        sudo cpupower frequency-set --governor performance 2>/dev/null || true
    fi

    print_status "$GREEN" "System settings optimized"
}

# Function to configure GPU acceleration
configure_gpu_acceleration() {
    if check_gpu_availability; then
        print_status "$BLUE" "Configuring GPU acceleration..."

        # Enable GPU acceleration if not already set
        export GPU_ACCELERATION_ENABLED=true
        export GPU_DEVICE_IDS=0
        export GPU_MAX_MEMORY_MB=8192
        export GPU_BATCH_SIZE=32
        export GPU_MAX_CONCURRENT_BATCHES=3

        print_status "$GREEN" "GPU acceleration configured"
    else
        print_status "$YELLOW" "GPU acceleration not available - using CPU optimization"
        export GPU_ACCELERATION_ENABLED=false
    fi
}

# Function to optimize database settings
optimize_database_settings() {
    print_status "$BLUE" "Configuring database optimization..."

    # Enable database optimization
    export DATABASE_OPTIMIZATION_ENABLED=true
    export DB_AUTO_CREATE_INDEXES=true
    export DB_MONITORING_ENABLED=true
    export DB_PERFORMANCE_THRESHOLD=1000

    print_status "$GREEN" "Database optimization configured"
}

# Function to configure caching
configure_caching() {
    print_status "$BLUE" "Configuring caching layers..."

    # Enable memory caching
    export CACHE_MEMORY_ENABLED=true
    export CACHE_MEMORY_MAX_SIZE=1000
    export CACHE_MEMORY_DEFAULT_TTL=300000

    # Enable CDN caching if credentials are available
    if [ -n "${CDN_API_TOKEN:-}" ] && [ -n "${CDN_ZONE_ID:-}" ]; then
        export CDN_CACHING_ENABLED=true
        print_status "$GREEN" "CDN caching configured"
    else
        print_status "$YELLOW" "CDN credentials not found - CDN caching disabled"
    fi
}

# Function to configure auto-scaling
configure_autoscaling() {
    print_status "$BLUE" "Configuring auto-scaling..."

    export AUTO_SCALING_ENABLED=true
    export AUTO_SCALING_CPU_THRESHOLD=80
    export AUTO_SCALING_MEMORY_THRESHOLD=85
    export AUTO_SCALING_LATENCY_THRESHOLD=5000
    export AUTO_SCALING_MIN_INSTANCES=1
    export AUTO_SCALING_MAX_INSTANCES=10

    print_status "$GREEN" "Auto-scaling configured"
}

# Function to load performance environment
load_performance_config() {
    local perf_config_file="$(dirname "$0")/../../.env.performance"

    if [ -f "$perf_config_file" ]; then
        print_status "$BLUE" "Loading performance configuration from $perf_config_file"
        # shellcheck source=/dev/null
        set -a
        # shellcheck source=/dev/null
        source "$perf_config_file"
        set +a
        print_status "$GREEN" "Performance configuration loaded"
    else
        print_status "$YELLOW" "Performance configuration file not found - using defaults"
    fi
}

# Function to display performance summary
show_performance_summary() {
    print_status "$GREEN" "=== Performance Configuration Summary ==="

    echo "GPU Acceleration: ${GPU_ACCELERATION_ENABLED:-false}"
    echo "Database Optimization: ${DATABASE_OPTIMIZATION_ENABLED:-false}"
    echo "Auto-scaling: ${AUTO_SCALING_ENABLED:-false}"
    echo "Memory Cache: ${CACHE_MEMORY_ENABLED:-false}"
    echo "CDN Cache: ${CDN_CACHING_ENABLED:-false}"
    echo "ML Optimization: ${ML_OPTIMIZATION_ENABLED:-false}"
    echo "Node Memory Limit: ${NODE_MAX_OLD_SPACE_SIZE:-default}"

    if [ "${GPU_ACCELERATION_ENABLED:-false}" = "true" ]; then
        echo "GPU Batch Size: ${GPU_BATCH_SIZE:-default}"
        echo "GPU Max Memory: ${GPU_MAX_MEMORY_MB:-default}MB"
    fi

    print_status "$GREEN" "=== End Summary ==="
}

# Function to validate performance settings
validate_performance_settings() {
    print_status "$BLUE" "Validating performance settings..."

    local errors=0

    # Check Node.js version
    local node_version=$(node --version | cut -d'v' -f2)
    local node_major=$(echo "$node_version" | cut -d'.' -f1)
    if [ "$node_major" -lt 20 ]; then
        print_status "$RED" "Node.js version $node_version is below recommended version 20+"
        ((errors++))
    fi

    # Check available memory
    if command -v free >/dev/null 2>&1; then
        local available_mem=$(free -m | awk 'NR==2{printf "%.0f", $7}')
        if [ "$available_mem" -lt 4096 ]; then
            print_status "$YELLOW" "Available memory (${available_mem}MB) is below recommended 4GB"
        fi
    fi

    # Check if required ports are available
    local ports=(3000 3001 6333 5432)
    for port in "${ports[@]}"; do
        if lsof -i ":$port" >/dev/null 2>&1; then
            print_status "$YELLOW" "Port $port is already in use"
        fi
    done

    if [ "$errors" -eq 0 ]; then
        print_status "$GREEN" "Performance settings validation passed"
    else
        print_status "$RED" "Performance settings validation failed with $errors errors"
        return 1
    fi
}

# Main execution
main() {
    print_status "$GREEN" "Starting Cortex-OS Performance Optimization..."

    # Load performance configuration
    load_performance_config

    # Optimize system settings
    optimize_system_settings

    # Configure various performance components
    configure_gpu_acceleration
    optimize_database_settings
    configure_caching
    configure_autoscaling

    # Validate settings
    validate_performance_settings

    # Show summary
    show_performance_summary

    print_status "$GREEN" "Performance optimization complete!"
    print_status "$BLUE" "You can now start Cortex-OS with optimized settings."
    print_status "$BLUE" "Example: pnpm dev or pnpm build"
}

# Run main function
main "$@"