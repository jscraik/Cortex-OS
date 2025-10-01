#!/bin/bash
# Alternative Dependency Update Script
# Use this when pnpm workspace commands fail

set -e

echo "🚀 Alternative Dependency Update Strategy"
echo "========================================"

echo "📦 Method 1: Update individual package.json files"
echo "Finding all package.json files..."
find . -name "package.json" -not -path "*/node_modules/*" | while read -r file; do
    echo "Found: $file"
done

echo ""
echo "📦 Method 2: Use npm update for non-workspace packages"
echo "This works for packages without workspace: protocol"

echo ""
echo "📦 Method 3: Update key dependencies manually"
echo "Manually update version numbers in package.json files"

echo ""
echo "📦 Method 4: Use mise to manage tool versions"
echo "Current tool versions:"
mise list

echo ""
echo "✅ Completed updates:"
echo "  - Python packages (uv sync --upgrade)"
echo "  - Node.js runtime (v22.19.0)"
echo "  - Root npm dependencies"
echo "  - Configuration files"

echo ""
echo "📋 To complete remaining updates:"
echo "1. Manually check key package.json files for outdated versions"
echo "2. Update critical security dependencies"
echo "3. Test applications after updates"
echo "4. Consider pnpm reinstall if workspace issues persist"
