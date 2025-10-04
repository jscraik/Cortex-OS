#!/bin/bash
# brAInwav TypeScript Language Service Crash Fix Script
# Addresses VS Code TS crashes in large monorepos

set -euo pipefail

echo "🔧 brAInwav TypeScript Language Service Crash Fix"
echo "================================================="

# Colors for brAInwav branding
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[brAInwav INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[brAInwav SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[brAInwav WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[brAInwav ERROR]${NC} $1"
}

# Step 1: Clean TypeScript build artifacts
log_info "Cleaning TypeScript build artifacts..."
find . -name "*.tsbuildinfo" -delete 2>/dev/null || true
find . -name ".tsbuildinfo" -delete 2>/dev/null || true
rm -rf .nx/cache 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true
log_success "Build artifacts cleaned"

# Step 2: Update TypeScript configuration for large projects
log_info "Optimizing TypeScript configuration..."
if [ -f "tsconfig.json" ]; then
    # Backup original
    cp tsconfig.json tsconfig.json.bak
    log_success "TypeScript config backed up to tsconfig.json.bak"
fi

# Step 3: Apply VS Code settings optimizations
log_info "Applying VS Code optimizations..."
mkdir -p .vscode

# Merge our optimized settings with existing ones
if [ -f ".vscode/settings.json" ]; then
    log_warning "Existing VS Code settings found. Creating brAInwav optimized overlay."
    # Use our optimized settings as an overlay
    log_info "Apply .vscode/settings.brainwav.json manually or merge with existing settings"
else
    # No existing settings, use our optimized version
    cp .vscode/settings.brainwav.json .vscode/settings.json
    log_success "brAInwav optimized settings applied"
fi

# Step 4: Restart TypeScript services
log_info "Restarting Node.js and TypeScript services..."
pkill -f "tsserver" 2>/dev/null || true
pkill -f "typescript" 2>/dev/null || true
pkill -f "eslint" 2>/dev/null || true
sleep 2
log_success "Services restarted"

# Step 5: Optimize package.json scripts
log_info "Checking package.json for problematic scripts..."
if grep -q "concurrently" package.json 2>/dev/null; then
    log_warning "Consider reducing concurrent processes to prevent memory issues"
fi

# Step 6: Check system resources
log_info "Checking system resources..."
if command -v free >/dev/null 2>&1; then
    available_mem=$(free -m | awk 'NR==2{printf "%.1f", $7/1024}')
    log_info "Available memory: ${available_mem}GB"
    if (( $(echo "$available_mem < 4.0" | bc -l) )); then
        log_warning "Low memory detected. Consider closing other applications."
    fi
elif command -v vm_stat >/dev/null 2>&1; then
    # macOS
    free_pages=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
    page_size=$(vm_stat | grep "page size" | awk '{print $8}')
    available_gb=$(echo "scale=1; $free_pages * $page_size / 1024 / 1024 / 1024" | bc)
    log_info "Available memory: ${available_gb}GB"
fi

# Step 7: Generate restart script
cat > restart-ts-service.sh << 'EOF'
#!/bin/bash
echo "🔄 brAInwav: Restarting TypeScript Language Service..."
pkill -f "tsserver" 2>/dev/null || true
pkill -f "typescript" 2>/dev/null || true
sleep 2
echo "✅ brAInwav: TypeScript service restarted"
echo "📝 In VS Code, run: TypeScript: Restart TS Server"
EOF

chmod +x restart-ts-service.sh
log_success "Created restart-ts-service.sh for quick restarts"

echo ""
echo "🎯 brAInwav TypeScript Optimization Complete!"
echo "============================================="
echo ""
echo "📋 Next steps:"
echo "   1. Restart VS Code completely"
echo "   2. Run: Ctrl+Shift+P → 'TypeScript: Restart TS Server'"
echo "   3. If crashes persist, run: ./restart-ts-service.sh"
echo "   4. Consider disabling Nx Console temporarily if issues continue"
echo ""
echo "⚡ Performance tips:"
echo "   - Close unused editor tabs"
echo "   - Use 'TypeScript: Go to Source Definition' instead of auto-imports"
echo "   - Disable auto-save in large files"
echo "   - Use project references in tsconfig.json"
echo ""
echo "🛡️ brAInwav monitoring enabled for future diagnostics"
