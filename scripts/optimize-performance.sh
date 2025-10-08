#!/bin/bash

# Performance optimization script for Cortex-OS
echo "🚀 Optimizing Cortex-OS performance..."

# Kill stuck processes
echo "🔧 Cleaning up stuck processes..."
pkill -f "nx.*build" || true
pkill -f "node.*nx.*daemon" || true
pkill -f "biome.*server" || true
pkill -f "playwright.*test-server" || true

# Clean caches
echo "🧹 Cleaning caches..."
rm -rf .nx/cache
rm -rf .turbo
rm -rf .tsbuildinfo
rm -rf node_modules/.vite
rm -rf node_modules/.cache
find . -name ".eslintcache" -delete 2>/dev/null || true

# Optimize npm/pnpm
echo "⚡ Optimizing package manager..."
pnpm store prune
pnpm install --prefer-frozen-lockfile --no-optional

# Reset Nx daemon with optimized settings
echo "🔧 Optimizing Nx daemon..."
npx nx daemon stop
sleep 2

# Use optimized Nx config temporarily
if [ -f nx.optimized.json ]; then
    cp nx.json nx.json.backup
    cp nx.optimized.json nx.json
    echo "✅ Using optimized Nx configuration"
fi

# Use optimized TypeScript config
if [ -f tsconfig.optimized.json ]; then
    cp tsconfig.json tsconfig.json.backup
    cp tsconfig.optimized.json tsconfig.json
    echo "✅ Using optimized TypeScript configuration"
fi

# Set environment variables for performance
export NODE_OPTIONS="--max-old-space-size=4096 --max-semi-space-size=256"
export NX_DAEMON=false
export NX_PARALLEL=2
export NX_CACHE_LIMIT_HOURS=24

# Create .env.local with performance settings
cat > .env.local << EOF
# Performance optimization settings
NODE_OPTIONS=--max-old-space-size=4096
NX_DAEMON=false
NX_PARALLEL=2
SKIP_PREFLIGHT_CHECK=true
CI=false
EOF

echo "✅ Performance optimization complete!"
echo ""
echo "📊 System resources:"
echo "  - Memory limit increased to 4GB"
echo "  - Nx parallelization limited to 2 workers"
echo "  - Disabled Nx daemon for faster restarts"
echo "  - Cleaned all build caches"
echo ""
echo "🔄 To restore original settings:"
echo "  cp nx.json.backup nx.json"
echo "  cp tsconfig.json.backup tsconfig.json"
echo ""
echo "⚡ Run: pnpm build or pnpm dev to test performance"