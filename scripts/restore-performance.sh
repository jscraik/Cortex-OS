#!/bin/bash

# Restore original performance settings for Cortex-OS
echo "🔄 Restoring original Cortex-OS settings..."

# Restore original configurations
if [ -f nx.json.backup ]; then
    mv nx.json.backup nx.json
    echo "✅ Restored original nx.json"
fi

if [ -f tsconfig.json.backup ]; then
    mv tsconfig.json.backup tsconfig.json
    echo "✅ Restored original tsconfig.json"
fi

# Restart Nx daemon
echo "🔧 Restarting Nx daemon..."
npx nx daemon stop
sleep 2

# Clean up .env.local
if [ -f .env.local ]; then
    rm .env.local
    echo "✅ Removed performance .env.local"
fi

# Clean caches again
rm -rf .nx/cache .tsbuildinfo

echo "✅ Settings restored to original configuration"
echo "⚡ Run: pnpm build or pnpm dev to test"