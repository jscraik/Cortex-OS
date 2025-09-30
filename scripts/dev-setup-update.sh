#!/bin/bash
# dev-setup-update.sh - Update script for DevContainer

set -euo pipefail

echo "🔄 Updating DevContainer..."

cd /opt/cortex-home

# Update dependencies
echo "Updating dependencies..."
pnpm update

# Update mise tools
echo "Updating mise tools..."
mise install

# Clean caches
echo "Cleaning caches..."
pnpm store prune
pnpm nx reset

# Rebuild if needed
echo "Rebuilding packages..."
pnpm build

echo "✅ Update complete!"