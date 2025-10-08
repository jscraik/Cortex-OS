#!/bin/bash

# Restore original VS Code settings
echo "🔄 Restoring original VS Code settings..."

# Restore workspace settings
if [ -f .vscode/settings.backup.json ]; then
    mv .vscode/settings.backup.json .vscode/settings.json
    echo "✅ Restored workspace settings"
else
    echo "⚠️  No backup settings found"
fi

# Re-enable extensions
echo "🔧 Re-enabling extensions..."
ENABLE_EXTENSIONS=(
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
    "GitHub.copilot"
    "GitHub.copilot-chat"
    "streetsidesoftware.code-spell-checker"
)

for ext in "${ENABLE_EXTENSIONS[@]}"; do
    code --enable-extension "$ext" 2>/dev/null || true
done

echo "✅ Re-enabled extensions"

# Clean up performance files
rm -f .vscode/performance.json
rm -rf .vscode/.tscache
rm -rf .vscode/typescript*

echo "✅ Cleaned up performance files"
echo ""
echo "🔄 VS Code settings restored to original configuration"