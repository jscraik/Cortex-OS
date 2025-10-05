#!/bin/bash
# brAInwav TypeScript Server Recovery Protocol
# Co-authored-by: brAInwav Development Team <dev@brainwav.dev>

set -e

echo "🔧 brAInwav TypeScript Server Recovery Protocol"
echo "=============================================="

# Step 1: Terminate rogue TSServer processes
echo "📦 Step 1: Terminating TypeScript server processes..."
TSSERVER_PIDS=$(ps aux | grep -i tsserver | grep -v grep | awk '{print $2}')
if [ -n "$TSSERVER_PIDS" ]; then
    echo "Found TSServer processes: $TSSERVER_PIDS"
    for pid in $TSSERVER_PIDS; do
        echo "  Killing process $pid..."
        kill -9 "$pid" 2>/dev/null || echo "  Process $pid already terminated"
    done
    sleep 2
else
    echo "  No TSServer processes found"
fi

# Step 2: Clear TypeScript cache directories
echo "🗑️  Step 2: Clearing TypeScript cache directories..."

# VS Code TypeScript cache
VSCODE_CACHE_DIRS=$(find ~/.vscode* -name "*typescript*" -type d 2>/dev/null || true)
if [ -n "$VSCODE_CACHE_DIRS" ]; then
    echo "Clearing VS Code TypeScript cache..."
    echo "$VSCODE_CACHE_DIRS" | while read -r dir; do
        echo "  Removing: $dir"
        rm -rf "$dir" 2>/dev/null || true
    done
fi

# Qoder TypeScript cache
QODER_CACHE_DIRS=$(find ~/.qoder* -name "*typescript*" -type d 2>/dev/null || true)
if [ -n "$QODER_CACHE_DIRS" ]; then
    echo "Clearing Qoder TypeScript cache..."
    echo "$QODER_CACHE_DIRS" | while read -r dir; do
        echo "  Removing: $dir"
        rm -rf "$dir" 2>/dev/null || true
    done
fi

# Local TypeScript build info
echo "Clearing local TypeScript build cache..."
find . -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true
find . -name ".tscache" -type d -exec rm -rf {} + 2>/dev/null || true

# Step 3: Clear temp directories
echo "🧹 Step 3: Clearing temporary files..."
TEMP_DIRS=$(find /var/folders -name "*vscode-typescript*" -type d 2>/dev/null || true)
if [ -n "$TEMP_DIRS" ]; then
    echo "$TEMP_DIRS" | while read -r dir; do
        echo "  Removing temp: $dir"
        rm -rf "$dir" 2>/dev/null || true
    done
fi

# Step 4: Check memory usage
echo "📊 Step 4: Checking current memory usage..."
MEMORY_USAGE=$(ps aux | grep -E "(node|typescript|tsserver)" | grep -v grep | awk '{sum += $6} END {print sum/1024}' 2>/dev/null || echo "0")
echo "  Current TypeScript-related memory usage: ${MEMORY_USAGE}MB"

echo ""
echo "✅ Recovery completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Apply optimized TypeScript configuration"
echo "2. Disable problematic extensions (nrwl.angular-console)"
echo "3. Restart your IDE"
echo ""
echo "💡 If issues persist, run: pnpm ts:configure:performance"
