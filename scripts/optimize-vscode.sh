#!/bin/bash

# VS Code performance optimization script for Cortex-OS
echo "⚡ Optimizing VS Code for Cortex-OS performance..."

# Backup current settings
if [ -f .vscode/settings.json ]; then
    cp .vscode/settings.json .vscode/settings.backup.json
    echo "✅ Backed up current workspace settings"
fi

# Apply optimized settings
cp .vscode/settings.optimized.json .vscode/settings.json
echo "✅ Applied performance-optimized settings"

# Disable resource-intensive extensions
echo "🔧 Managing extensions..."

# Extensions to disable for performance
DISABLE_EXTENSIONS=(
    "ms-vscode.vscode-json"
    "redhat.vscode-yaml"
    "ms-python.python"
    "ms-python.black-formatter"
    "charliermarsh.ruff"
    "ms-python.mypy-type-checker"
    "dbaeumer.vscode-eslint"
    "esbenp.prettier-vscode"
    "biomejs.biome"
    "bradlc.vscode-tailwindcss"
    "ms-vscode.vscode-typescript-next"
    "ms-vscode.live-server"
    "ms-vscode.vscode-eslint"
    "GitHub.copilot"
    "GitHub.copilot-chat"
    "ms-vscode.vscode-json"
    "yzhang.markdown-all-in-one"
    "streetsidesoftware.code-spell-checker"
    "ms-vscode.vscode-docker"
    "ms-kubernetes-tools.vscode-kubernetes-tools"
    "ms-vscode-remote.remote-containers"
    "ms-vscode.remote-explorer"
)

for ext in "${DISABLE_EXTENSIONS[@]}"; do
    code --disable-extension "$ext" 2>/dev/null || true
done

echo "✅ Disabled resource-intensive extensions"

# Clear VS Code caches
echo "🧹 Clearing VS Code caches..."
rm -rf ~/.vscode-server/server-*-*/extensions/*/node_modules/.cache 2>/dev/null || true
rm -rf ~/.vscode/extensions/*/node_modules/.cache 2>/dev/null || true
rm -rf .vscode/.vscode-test-web 2>/dev/null || true

# Optimize TypeScript server
echo "🔧 Optimizing TypeScript server..."
rm -rf .vscode/.tscache 2>/dev/null || true
rm -rf .vscode/typescript* 2>/dev/null || true

# Create performance monitoring file
cat > .vscode/performance.json << EOF
{
  "enabled": true,
  "maxMemory": 2048,
  "disableTypeSuggestions": true,
  "disableAutoImport": true,
  "disableSemanticHighlighting": true,
  "disableCodeLens": true,
  "disableLinting": true,
  "disableFormatting": true
}
EOF

echo "✅ Created performance configuration"

# Add to .gitignore if not already present
if ! grep -q ".vscode/settings.backup.json" .gitignore 2>/dev/null; then
    echo ".vscode/settings.backup.json" >> .gitignore
    echo ".vscode/performance.json" >> .gitignore
    echo ".vscode/.tscache" >> .gitignore
    echo ".vscode/typescript*" >> .gitignore
    echo "✅ Updated .gitignore with performance files"
fi

echo ""
echo "⚡ VS Code optimization complete!"
echo ""
echo "🔄 To restore original settings:"
echo "  cp .vscode/settings.backup.json .vscode/settings.json"
echo ""
echo "🚀 To re-enable disabled extensions:"
echo "  code --enable-extension <extension-id>"
echo ""
echo "💡 Performance improvements:"
echo "  • Reduced TypeScript memory usage to 2GB"
echo "  • Disabled auto-suggestions and auto-imports"
echo "  • Turned off semantic highlighting"
echo "  • Disabled code lens and folding"
echo "  • Optimized file watching exclusions"
echo "  • Disabled resource-intensive extensions"