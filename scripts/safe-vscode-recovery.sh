#!/bin/bash

# Safe VS Code recovery - Only target VS Code processes
echo "🔧 Safe VS Code Recovery"

# Only kill actual VS Code processes (not codex or other apps)
echo "🔧 Stopping VS Code processes only..."
pkill -f "Visual Studio Code.app" 2>/dev/null || true
pkill -f "Code Helper.*Visual Studio Code" 2>/dev/null || true
pkill -f "Electron.*Visual Studio Code" 2>/dev/null || true
sleep 2

# Clear only VS Code specific caches
echo "🧹 Clearing VS Code caches only..."
rm -rf ~/Library/Caches/com.microsoft.VSCode 2>/dev/null || true
rm -rf ~/.vscode-server 2>/dev/null || true
rm -rf .vscode/.tscache 2>/dev/null || true
rm -rf .vscode/typescript* 2>/dev/null || true
rm -rf .vscode/.logs 2>/dev/null || true

# Create lightweight settings
echo "⚡ Creating lightweight settings..."
cat > .vscode/settings.json << 'EOF'
{
  // --- Lightweight VS Code Settings ----------------------------------------
  "telemetry.enableTelemetry": false,
  "extensions.autoCheckUpdates": false,
  "extensions.autoUpdate": false,
  "workbench.tips.enabled": false,
  "workbench.startupEditor": "none",
  "workbench.welcome.enabled": false,
  "workbench.colorTheme": "Default Dark+",
  "workbench.activityBar.visible": true,
  "workbench.statusBar.visible": true,
  "workbench.tree.enableStickyScroll": false,
  "workbench.list.smoothScrolling": false,

  // --- Minimal Editor --------------------------------------------------------
  "editor.fontSize": 14,
  "editor.fontFamily": "Monaco, monospace",
  "editor.minimap.enabled": false,
  "editor.glyphMargin": false,
  "editor.lineNumbers": "on",
  "editor.renderWhitespace": "selection",
  "editor.renderLineHighlight": "line",
  "editor.occurrencesHighlight": "off",
  "editor.codeLens": false,
  "editor.formatOnSave": false,
  "editor.quickSuggestions": false,
  "editor.parameterHints.enabled": false,
  "editor.wordBasedSuggestions": false,
  "editor.lightbulb.enabled": false,
  "editor.cursorBlinking": "solid",
  "editor.smoothScrolling": false,
  "editor.cursorSmoothCaretAnimation": "off",

  // --- TypeScript (Lightweight) ---------------------------------------------
  "typescript.tsserver.maxTsServerMemory": 1536,
  "typescript.tsserver.experimental.enableProjectDiagnostics": false,
  "typescript.suggest.autoImports": false,
  "typescript.updateImportsOnFileMove.enabled": "never",
  "typescript.suggest.completeFunctionCalls": false,
  "typescript.validate.enable": true,
  "javascript.validate.enable": false,

  // --- File Watching (Optimized) -------------------------------------------
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 10000,
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.git/**": true,
    "**/.nx/**": true,
    "**/.turbo/**": true,
    "**/.vitest/**": true,
    "**/dist/**": true,
    "**/coverage/**": true,
    "**/mcp-servers/**": true,
    "**/__pycache__/**": true,
    "**/.pytest_cache/**": true,
    "**/.ruff_cache/**": true,
    "**/.mypy_cache/**": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.nx": true,
    "**/.turbo": true,
    "**/.vitest": true,
    "**/coverage": true,
    "**/__pycache__": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.nx": true,
    "**/.turbo": true,
    "**/.vitest": true,
    "**/coverage": true
  },

  // --- Extensions (Selective) -----------------------------------------------
  "eslint.enable": false,
  "prettier.enable": false,
  "python.linting.enabled": false,
  "github.copilot.enable": {
    "*": true,
    "plaintext": false,
    "scminput": false
  },

  // --- Terminal -------------------------------------------------------------
  "terminal.integrated.scrollback": 1000,
  "terminal.integrated.smoothScrolling": false,
  "terminal.integrated.gpuAcceleration": "off",

  // --- Language Specific ----------------------------------------------------
  "[typescript]": {
    "editor.defaultFormatter": null,
    "editor.formatOnSave": false
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": null,
    "editor.formatOnSave": false
  },
  "[json]": {
    "editor.defaultFormatter": null,
    "editor.formatOnSave": false
  },
  "[python]": {
    "editor.defaultFormatter": null,
    "editor.formatOnSave": false
  }
}
EOF

echo ""
echo "✅ Safe VS Code recovery complete!"
echo ""
echo "🔧 Applied optimizations:"
echo "   • Cleared VS Code caches only"
echo "   • Reduced TypeScript memory to 1.5GB"
echo "   • Disabled heavy features"
echo "   • Kept Copilot enabled"
echo "   • Optimized file watching"
echo ""
echo "🚀 Restart VS Code normally:"
echo "   • Open from Applications folder"
echo "   • Or use: open -a 'Visual Studio Code' ."
echo ""
echo "⚡ VS Code should now load much faster!"