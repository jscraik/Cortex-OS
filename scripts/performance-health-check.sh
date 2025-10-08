#!/bin/bash

# Performance health check for Cortex-OS
echo "🏥 Cortex-OS Performance Health Check"
echo "====================================="

# Check system resources
echo ""
echo "📊 System Resources:"
echo "  Memory Usage:"
free -h | head -2

echo ""
echo "  Disk Usage:"
du -sh node_modules/ .nx/cache/ dist/ 2>/dev/null | head -3

# Check problematic processes
echo ""
echo "🔍 Problematic Processes:"
echo "  High CPU processes:"
ps aux | sort -nr -k 3 | awk 'NR<=3 && $3>50 {print $0}' || echo "    None found"

echo "  High Memory processes:"
ps aux | sort -nr -k 4 | awk 'NR<=3 && $4>2 {print $0}' || echo "    None found"

echo "  Stuck Nx processes:"
ps aux | grep "nx.*build" | grep -v grep || echo "    None found"

# Check cache sizes
echo ""
echo "💾 Cache Status:"
[ -d .nx/cache ] && echo "  Nx cache: $(du -sh .nx/cache | cut -f1)" || echo "  Nx cache: clean"
[ -d .turbo ] && echo "  Turbo cache: $(du -sh .turbo | cut -f1)" || echo "  Turbo cache: clean"
[ -f .tsbuildinfo ] && echo "  TS BuildInfo: exists" || echo "  TS BuildInfo: clean"

# Performance recommendations
echo ""
echo "💡 Recommendations:"
if du -sh node_modules/ 2>/dev/null | awk '{print $1}' | grep -E '[0-9]+G' > /dev/null; then
    echo "  ⚠️  Large node_modules detected - consider running pnpm store prune"
else
    echo "  ✅ node_modules size is acceptable"
fi

if ps aux | grep -q "nx.*build"; then
    echo "  ⚠️  Stuck Nx processes detected - run ./scripts/optimize-performance.sh"
else
    echo "  ✅ No stuck processes found"
fi

echo ""
echo "⚡ Quick fixes:"
echo "  • Optimize: ./scripts/optimize-performance.sh"
echo "  • Restore: ./scripts/restore-performance.sh"
echo "  • Reset Nx: nx reset && rm -rf .nx/cache"
echo "  • Clean packages: pnpm store prune && pnpm install --force"