#!/bin/bash
# dev-setup-oncreate.sh - Setup script for DevContainer onCreate

set -euo pipefail

echo "[brAInwav] 🚀 Initializing Cortex-OS DevContainer..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Set up environment
export NODE_ENV=development
export CORTEX_HOME=/opt/cortex-home
export AGENT_TOOLKIT_TOOLS_DIR=$CORTEX_HOME/tools/agent-toolkit

log_info "[brAInwav] Setting up workspace..."

# Install dependencies (fast path by default)
log_info "[brAInwav] Installing Node.js dependencies (fast path)..."
cd $CORTEX_HOME
pnpm install --frozen-lockfile --prefer-offline || {
    log_warn "pnpm install failed, trying with corepack..."
    corepack enable
    pnpm install --frozen-lockfile --prefer-offline
}

# Trust mise configuration (non-fatal and quick)
log_info "[brAInwav] Configuring mise..."
mise trust || true
if [ "${CORTEX_DEV_FULL:-0}" = "1" ]; then
    log_info "[brAInwav] Installing mise tools (full mode)"
    mise install || true
else
    log_info "[brAInwav] Skipping mise install (set CORTEX_DEV_FULL=1 to enable)"
fi

# Create necessary directories
log_info "[brAInwav] Creating directories..."
mkdir -p $CORTEX_HOME/tools/agent-toolkit
mkdir -p $CORTEX_HOME/.nx/cache
mkdir -p $CORTEX_HOME/coverage

# Set up Git hooks if not already set
if [ "${CORTEX_DEV_FULL:-0}" = "1" ]; then
    if [ ! -d "$CORTEX_HOME/.git/hooks" ]; then
            log_info "[brAInwav] Setting up Git hooks..."
            cd $CORTEX_HOME
            npx husky install || true
    fi
else
    log_info "[brAInwav] Skipping Git hooks setup (set CORTEX_DEV_FULL=1 to enable)"
fi

# Skip default build for faster startup; allow opt-in
if [ "${CORTEX_DEV_FULL:-0}" = "1" ]; then
    log_info "[brAInwav] Building packages (full mode)..."
    pnpm build || log_warn "Build failed - this might be expected on first run"
else
    log_info "[brAInwav] Skipping initial build (set CORTEX_DEV_FULL=1 to enable)"
fi

# Optional readiness check
if [ "${CORTEX_DEV_FULL:-0}" = "1" ]; then
    log_info "[brAInwav] Verifying installation..."
    pnpm readiness:check || log_warn "Readiness check failed - some services might not be available"
else
    log_info "[brAInwav] Skipping readiness check (set CORTEX_DEV_FULL=1 to enable)"
fi

# Create a welcome message
cat > $CORTEX_HOME/.devcontainer-welcome.txt << 'EOF'
🎉 Welcome to Cortex-OS Development Environment!

Quick Start:
1. Open a terminal in VS Code (Ctrl+Shift+`)
2. Start development: pnpm dev
3. Run tests: pnpm test
4. Build project: pnpm build

Services:
- Qdrant Dashboard: http://localhost:6333/dashboard
- Local Memory API: http://localhost:3028
- MCP Hub: http://localhost:9600

Useful Commands:
- Install deps: pnpm install
- Lint code: pnpm lint
- Type check: pnpm typecheck
- Run all checks: pnpm lint && pnpm test
- Memory-safe tests: pnpm test:safe

Happy coding! 🚀
EOF

log_info "[brAInwav] ✅ DevContainer setup complete!"
log_info "[brAInwav] Check .devcontainer-welcome.txt for quick start info."