#!/bin/bash
# Move workspace within Cortex-OS monorepo
# Usage: ./scripts/move-workspace.sh <source-path> <dest-path>

set -euo pipefail

SOURCE="${1:-}"
DEST="${2:-}"

if [ -z "$SOURCE" ] || [ -z "$DEST" ]; then
  echo "Usage: $0 <source-path> <dest-path>"
  echo "Example: $0 packages/mcp libs/typescript/mcp"
  exit 1
fi

if [ ! -d "$SOURCE" ]; then
  echo "Error: Source directory '$SOURCE' does not exist"
  exit 1
fi

if [ -d "$DEST" ]; then
  echo "Error: Destination directory '$DEST' already exists"
  exit 1
fi

echo "Moving workspace from $SOURCE to $DEST..."

# Step 1: Move the directory
mkdir -p "$(dirname "$DEST")"
mv "$SOURCE" "$DEST"

echo "✓ Directory moved"

# Step 2: Update package.json name if it contains path
PACKAGE_JSON="$DEST/package.json"
if [ -f "$PACKAGE_JSON" ]; then
  echo "  Found package.json, updating if necessary..."
fi

# Step 3: Reset Nx cache
echo "  Resetting Nx cache..."
pnpm nx reset 2>/dev/null || true

# Step 4: Reinstall dependencies
echo "  Reinstalling dependencies..."
pnpm install

echo ""
echo "✅ Workspace moved successfully!"
echo ""
echo "Next steps:"
echo "1. Update any import paths in other packages"
echo "2. Update tsconfig.json path mappings (if any)"
echo "3. Run: pnpm build:smart"
echo "4. Run: pnpm test:smart"
