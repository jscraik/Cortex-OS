#!/bin/bash
# Setup symlinks for easy access to project directories

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🔗 Setting up symlinks in project-workspace..."
echo "   Workspace: $SCRIPT_DIR"
echo "   Root: $WORKSPACE_ROOT"
echo ""

# Create symlinks
LINKS=(
  ".cortex"
  ".github"
  "tasks"
  "project-documentation"
)

for link in "${LINKS[@]}"; do
  TARGET="$WORKSPACE_ROOT/$link"
  LINK_PATH="$SCRIPT_DIR/$link"
  
  if [ -e "$LINK_PATH" ] || [ -L "$LINK_PATH" ]; then
    echo "   ⚠️  Removing existing: $link"
    rm -rf "$LINK_PATH"
  fi
  
  if [ -e "$TARGET" ]; then
    ln -s "$TARGET" "$LINK_PATH"
    echo "   ✓ Created symlink: $link -> $TARGET"
  else
    echo "   ✗ Target not found: $TARGET"
  fi
done

echo ""
echo "✅ Symlink setup complete!"
echo ""
echo "You can now access directories via:"
echo "   cd $SCRIPT_DIR/.cortex"
echo "   cd $SCRIPT_DIR/.github"
echo "   cd $SCRIPT_DIR/tasks"
echo "   cd $SCRIPT_DIR/project-documentation"
