#!/bin/bash
# dev-setup-update.sh - Update script for DevContainer

set -euo pipefail

echo "[brAInwav] 🔄 Updating DevContainer..."

cd /opt/cortex-home

# Update dependencies (opt-in)
if [ "${CORTEX_DEV_FULL:-0}" = "1" ]; then
	echo "[brAInwav] Updating dependencies (full mode)..."
	pnpm update || true
else
	echo "[brAInwav] Skipping pnpm update (set CORTEX_DEV_FULL=1 to enable)"
fi

# Update mise tools (opt-in)
if [ "${CORTEX_DEV_FULL:-0}" = "1" ]; then
	echo "[brAInwav] Updating mise tools (full mode)..."
	mise install || true
else
	echo "[brAInwav] Skipping mise install (set CORTEX_DEV_FULL=1 to enable)"
fi

# Clean caches (quick)
echo "[brAInwav] Cleaning caches..."
pnpm store prune || true
pnpm nx reset || true

# Rebuild (opt-in)
if [ "${CORTEX_DEV_FULL:-0}" = "1" ]; then
	echo "[brAInwav] Rebuilding packages (full mode)..."
	pnpm build || true
else
	echo "[brAInwav] Skipping rebuild (set CORTEX_DEV_FULL=1 to enable)"
fi

echo "[brAInwav] ✅ Update complete!"
