#!/bin/bash

# Cortex-OS Direct Build Script (Bypass NX)
# Builds individual packages directly using their package.json scripts

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

# Build individual package
build_package() {
    local package_dir="$1"
    local package_name
    package_name=$(basename "$package_dir")
    
    if [[ ! -f "$package_dir/package.json" ]]; then
        log_warning "No package.json found in $package_dir"
        return 0
    fi
    
    # Check if package has build script
    if ! grep -q '"build"' "$package_dir/package.json"; then
        log_info "Skipping $package_name (no build script)"
        return 0
    fi
    
    log_info "Building $package_name..."
    
    # Clean previous build
    rm -rf "$package_dir/dist" "$package_dir/build" 2>/dev/null || true
    
    # Change to package directory and build
    (
        cd "$package_dir"
        
        # Set production environment
        export NODE_ENV=production
        export NODE_OPTIONS="--max-old-space-size=2048"
        
        # Try building with pnpm
        if pnpm build 2>/dev/null; then
            log_success "✅ Built $package_name"
        elif npm run build 2>/dev/null; then
            log_success "✅ Built $package_name (using npm)"
        else
            log_warning "⚠️  Failed to build $package_name"
            return 1
        fi
    )
}

# Main build function
main() {
    log_info "🚀 Starting direct package builds (bypassing NX)..."
    
    # Define build order (dependencies first)
    local packages=(
        "packages/types"
        "packages/utils" 
        "packages/contracts"
        "packages/a2a/a2a-core"
        "packages/a2a/a2a-common"
        "packages/a2a/a2a-contracts"
        "packages/a2a/a2a-transport"
        "packages/a2a/a2a-handlers"
        "packages/a2a/a2a-schema-registry"
        "packages/a2a/a2a-observability"
        "packages/agents"
        "packages/model-gateway"
        "packages/mcp"
        "packages/orchestration"
        "packages/observability"
        "packages/registry"
        "packages/telemetry"
        "packages/policy"
        "packages/memories"
        "packages/mvp-core"
        "packages/mvp-server"
        "packages/kernel"
        "packages/evals"
        "packages/rag"
        "packages/simlab"
        "packages/prp-runner"
        "apps/cortex-os"
        "apps/api"
        "apps/cortex-py"
        "apps/mvp"
        "apps/asbr"
    )
    
    local built_count=0
    local failed_count=0
    
    for package in "${packages[@]}"; do
        if [[ -d "$package" ]]; then
            if build_package "$package"; then
                ((built_count++))
            else
                ((failed_count++))
            fi
        else
            log_warning "Package directory not found: $package"
        fi
    done
    
    log_info "Build Summary:"
    log_success "✅ Successfully built: $built_count packages"
    if [[ $failed_count -gt 0 ]]; then
        log_warning "⚠️  Failed builds: $failed_count packages"
    fi
    
    # Verify critical builds
    verify_critical_builds
    
    # Generate build report
    generate_build_report "$built_count" "$failed_count"
    
    if [[ $failed_count -eq 0 ]]; then
        log_success "🎉 All packages built successfully!"
    else
        log_warning "⚠️  Build completed with some failures"
    fi
}

verify_critical_builds() {
    log_info "Verifying critical builds..."
    
    local critical_packages=(
        "packages/agents/dist"
        "packages/model-gateway/dist"
        "packages/types/dist"
        "packages/utils/dist"
    )
    
    local missing=0
    
    for build_path in "${critical_packages[@]}"; do
        if [[ -d "$build_path" ]] && [[ -n "$(ls -A "$build_path" 2>/dev/null)" ]]; then
            log_success "✅ $build_path"
        else
            log_error "❌ Missing or empty: $build_path"
            ((missing++))
        fi
    done
    
    if [[ $missing -eq 0 ]]; then
        log_success "All critical builds verified"
    else
        log_error "$missing critical builds are missing"
        return 1
    fi
}

generate_build_report() {
    local built_count="$1"
    local failed_count="$2"
    local report_file="build-report-$(date +%Y%m%d-%H%M%S).md"
    
    {
        echo "# Cortex-OS Build Report"
        echo ""
        echo "**Build Date:** $(date)"
        echo "**Built Packages:** $built_count"
        echo "**Failed Packages:** $failed_count"
        echo "**Node.js Version:** $(node --version)"
        echo ""
        echo "## Built Packages"
        echo ""
        
        find . -name "dist" -type d | while read -r dist_dir; do
            if [[ -n "$(ls -A "$dist_dir" 2>/dev/null)" ]]; then
                local package_path
                package_path=$(dirname "$dist_dir")
                local size
                size=$(du -sh "$dist_dir" 2>/dev/null | cut -f1)
                echo "- ✅ **$package_path** ($size)"
            fi
        done
        
        echo ""
        echo "## Deployment Ready"
        echo ""
        echo "The following build artifacts are ready for deployment:"
        echo ""
        echo "### Core Services"
        if [[ -d "packages/agents/dist" ]]; then
            echo "- 🤖 **Agents Service** - AI agent runtime"
        fi
        if [[ -d "packages/model-gateway/dist" ]]; then
            echo "- 🚪 **Model Gateway** - AI model proxy"
        fi
        if [[ -d "apps/cortex-os/dist" ]]; then
            echo "- 🧠 **Cortex OS** - Main application"
        fi
        
        echo ""
        echo "### Next Steps"
        echo ""
        echo "1. **Docker Build:** Run docker build with these artifacts"
        echo "2. **Manual Deploy:** Copy dist directories to target servers"
        echo "3. **Environment:** Set NODE_ENV=production"
        
    } > "$report_file"
    
    log_success "Build report generated: $report_file"
}

# Run main function
main "$@"
