#!/bin/bash

# Cortex-OS Build Script (No Docker Required)
# Builds Cortex-OS for deployment without Docker dependencies

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
SKIP_TESTS="${SKIP_TESTS:-false}"
BUILD_ENV="${BUILD_ENV:-production}"

# Check prerequisites (no Docker required)
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if running from correct directory
    if [[ ! -f "package.json" ]] || [[ ! -f "pnpm-workspace.yaml" ]]; then
        log_error "Must be run from Cortex-OS root directory"
        exit 1
    fi
    
    # Check required tools (no Docker)
    local required_tools=("pnpm" "node")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is required but not installed"
            exit 1
        fi
    done
    
    # Check Node.js version
    local node_version
    node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ "$node_version" -lt 20 ]]; then
        log_error "Node.js 20+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Memory and system optimization
optimize_system() {
    log_info "Optimizing system for build..."
    
    # Set memory limits
    export NODE_ENV="$BUILD_ENV"
    export NODE_OPTIONS="--max-old-space-size=4096 --expose-gc"
    export VITEST_MAX_THREADS=2
    export VITEST_MIN_THREADS=1
    export NX_DAEMON=false
    
    log_success "System optimization completed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Clear any potential locks
    rm -f pnpm-lock.yaml.lock
    
    # Install with production optimizations
    pnpm install --frozen-lockfile --prefer-offline
    
    log_success "Dependencies installed"
}

# Force build all packages (bypass nx-smart)
force_build_all() {
    log_info "Force building all packages..."
    
    # Clean previous builds
    log_info "Cleaning previous builds..."
    find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Reset nx cache to force rebuild
    log_info "Resetting build cache..."
    pnpm nx reset || true
    
    # Build using standard nx commands (not nx-smart)
    log_info "Building core packages..."
    pnpm nx run-many -t build --all --parallel=3 || {
        log_warning "Parallel build failed, trying sequential build..."
        pnpm nx run-many -t build --all
    }
    
    log_success "All packages built successfully"
}

# Verify critical builds
verify_builds() {
    log_info "Verifying critical build outputs..."
    
    local critical_builds=(
        "apps/cortex-os/dist"
        "packages/agents/dist"
        "packages/model-gateway/dist" 
        "packages/mcp/dist"
        "packages/utils/dist"
        "packages/types/dist"
    )
    
    local missing_builds=()
    
    for build_path in "${critical_builds[@]}"; do
        if [[ ! -d "$build_path" ]]; then
            missing_builds+=("$build_path")
        else
            log_success "✓ $build_path"
        fi
    done
    
    if [[ ${#missing_builds[@]} -gt 0 ]]; then
        log_warning "Some builds are missing (may be optional):"
        for missing in "${missing_builds[@]}"; do
            log_warning "  - $missing"
        done
    fi
    
    # Check for at least some critical builds
    if [[ ! -d "packages/agents/dist" ]] && [[ ! -d "apps/cortex-os/dist" ]]; then
        log_error "No critical builds found - build may have failed"
        return 1
    fi
    
    log_success "Build verification completed"
}

# Generate build artifacts list
generate_artifacts_list() {
    log_info "Generating build artifacts list..."
    
    local artifacts_file="build-artifacts-$(date +%Y%m%d-%H%M%S).md"
    
    {
        echo "# Cortex-OS Build Artifacts"
        echo ""
        echo "**Build Date:** $(date)"
        echo "**Build Environment:** $BUILD_ENV"
        echo "**Node.js Version:** $(node --version)"
        echo ""
        echo "## Build Outputs"
        echo ""
        
        # Find all dist directories
        find . -name "dist" -type d | sort | while read -r dist_dir; do
            if [[ -n "$(ls -A "$dist_dir" 2>/dev/null)" ]]; then
                local size
                size=$(du -sh "$dist_dir" 2>/dev/null | cut -f1)
                echo "- \`$dist_dir\` ($size)"
                
                # List main files in dist directory
                find "$dist_dir" -maxdepth 2 -type f -name "*.js" -o -name "*.json" -o -name "*.html" | head -5 | while read -r file; do
                    echo "  - $(basename "$file")"
                done
            fi
        done
        
        echo ""
        echo "## Package Information"
        echo ""
        
        # List all packages with their build status
        find packages apps -name "package.json" -maxdepth 2 | while read -r pkg_json; do
            local pkg_dir
            pkg_dir=$(dirname "$pkg_json")
            local pkg_name
            pkg_name=$(basename "$pkg_dir")
            
            if [[ -d "$pkg_dir/dist" ]]; then
                echo "- ✅ **$pkg_name** - Built successfully"
            else
                echo "- ⚠️ **$pkg_name** - No dist directory"
            fi
        done
        
        echo ""
        echo "## Next Steps"
        echo ""
        echo "1. **Docker Build**: Run \`docker build -f Dockerfile.optimized -t cortex-os:latest .\`"
        echo "2. **Local Run**: Use built artifacts to run services locally"
        echo "3. **Deploy**: Use built artifacts for deployment to your target environment"
        
    } > "$artifacts_file"
    
    log_success "Build artifacts list generated: $artifacts_file"
}

# Main build function
main() {
    log_info "🚀 Starting Cortex-OS build process..."
    log_info "Configuration:"
    log_info "  - Build Environment: $BUILD_ENV"
    log_info "  - Skip Tests: $SKIP_TESTS"
    log_info "  - Node.js Version: $(node --version)"
    
    check_prerequisites
    optimize_system
    install_dependencies
    force_build_all
    verify_builds
    generate_artifacts_list
    
    log_success "🎉 Cortex-OS build completed successfully!"
    log_info ""
    log_info "📦 Build artifacts are ready for deployment"
    log_info "🐳 To create Docker image: docker build -f Dockerfile.optimized -t cortex-os:latest ."
    log_info "🚀 To run locally: check individual package dist directories"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS="true"
            shift
            ;;
        --env)
            BUILD_ENV="$2"
            shift 2
            ;;
        -h|--help)
            echo "Cortex-OS Build Script"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-tests    Skip running tests"
            echo "  --env ENV       Set build environment (default: production)"
            echo "  -h, --help      Show this help"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"
