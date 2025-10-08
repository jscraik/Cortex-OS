#!/bin/bash

# Complete VS Code recovery - Kill all processes and reset
echo "🚨 COMPLETE VS Code Recovery"

# Kill ALL VS Code related processes
echo "🔧 Terminating all VS Code processes..."
pkill -f "Visual Studio Code" || true
pkill -f "Code Helper" || true
pkill -f "Electron.*Code" || true
pkill -f "code" || true
pkill -f "VSCode" || true
pkill -f "vscode-server" || true
pkill -f "node.*typescript" || true
pkill -f "biome" || true
pkill -f "eslint" || true
sleep 3

# Clear ALL caches
echo "🧹 Clearing all caches..."
# User cache
rm -rf ~/Library/Caches/com.microsoft.VSCode 2>/dev/null || true
rm -rf ~/Library/Caches/com.microsoft.VSCodeInsiders 2>/dev/null || true
rm -rf ~/Library/Application Support/Code/User/workspaceStorage 2>/dev/null || true
rm -rf ~/Library/Application Support/Code/User/globalStorage 2>/dev/null || true
rm -rf ~/Library/Application Support/Code/logs 2>/dev/null || true

# VS Code Server cache
rm -rf ~/.vscode-server 2>/dev/null || true
rm -rf ~/.vscode-oss-dev 2>/dev/null || true

# Workspace cache
rm -rf .vscode/.tscache 2>/dev/null || true
rm -rf .vscode/typescript* 2>/dev/null || true
rm -rf .vscode/.extensions 2>/dev/null || true
rm -rf .vscode/.logs 2>/dev/null || true
rm -rf .vscode/.test 2>/dev/null || true

# Node modules cache (TypeScript language server)
rm -rf node_modules/typescript/lib/tsserver* 2>/dev/null || true

# Create minimal emergency settings
echo "⚡ Creating emergency settings..."
cat > .vscode/settings.json << 'EOF'
{
  // --- EMERGENCY MODE - ABSOLUTE MINIMUM --------------------------------
  "telemetry.enableTelemetry": false,
  "telemetry.enableCrashReporter": false,
  "extensions.autoCheckUpdates": false,
  "extensions.autoUpdate": false,
  "workbench.enableExperiments": false,
  "workbench.settings.enableNaturalLanguageSearch": false,
  "workbench.tips.enabled": false,
  "workbench.startupEditor": "none",
  "workbench.welcome.enabled": false,
  "workbench.tree.enableStickyScroll": false,
  "workbench.list.smoothScrolling": false,
  "workbench.activityBar.visible": false,
  "workbench.colorTheme": "Default High Contrast",
  "workbench.statusBar.visible": true,
  "workbench.sidebar.location": "left",
  "workbench.editor.enablePreview": false,
  "workbench.editor.showTabs": true,
  "workbench.editor.tabCloseButton": "off",

  // --- MINIMAL EDITOR -------------------------------------------------------
  "editor.fontSize": 12,
  "editor.fontFamily": "Monaco, Menlo, monospace",
  "editor.lineHeight": 1.2,
  "editor.minimap.enabled": false,
  "editor.glyphMargin": false,
  "editor.folding": false,
  "editor.lineNumbers": "on",
  "editor.renderWhitespace": "none",
  "editor.renderControlCharacters": false,
  "editor.renderLineHighlight": "none",
  "editor.occurrencesHighlight": "off",
  "editor.selectionHighlight": false,
  "editor.overviewRulerBorder": false,
  "editor.scrollbar.horizontal": "hidden",
  "editor.scrollbar.vertical": "visible",
  "editor.semanticHighlighting.enabled": false,
  "editor.codeLens": false,
  "editor.highlightActiveIndentGuide": false,
  "editor.showFoldingControls": "never",
  "editor.stickyScroll.enabled": false,
  "editor.linkedEditing": false,
  "editor.smoothScrolling": false,
  "editor.cursorBlinking": "solid",
  "editor.cursorSmoothCaretAnimation": "off",
  "editor.formatOnSave": false,
  "editor.formatOnType": false,
  "editor.quickSuggestions": false,
  "editor.parameterHints.enabled": false,
  "editor.suggest.showStatusBar": false,
  "editor.wordBasedSuggestions": false,
  "editor.lightbulb.enabled": false,
  "editor.tabSize": 2,
  "editor.insertSpaces": true,

  // --- TYPESCRIPT - ABSOLUTE MINIMAL ----------------------------------------
  "typescript.tsserver.maxTsServerMemory": 512,
  "typescript.tsserver.experimental.enableProjectDiagnostics": false,
  "typescript.suggest.autoImports": false,
  "typescript.updateImportsOnFileMove.enabled": "never",
  "typescript.preferences.includePackageJsonAutoImports": "off",
  "typescript.disableAutomaticTypeAcquisition": true,
  "typescript.suggest.completeFunctionCalls": false,
  "typescript.validate.enable": false,
  "typescript.preferences.includeCompletionsForModuleExports": false,
  "typescript.preferences.includeCompletionsForImportStatements": false,
  "javascript.validate.enable": false,
  "javascript.suggest.autoImports": false,

  // --- FILE SYSTEM MINIMAL -------------------------------------------------
  "files.autoSave": "off",
  "files.eol": "\n",
  "files.trimTrailingWhitespace": false,
  "files.trimFinalNewlines": false,
  "files.insertFinalNewline": false,
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
    "**/.mypy_cache/**": true,
    "**/tmp/**": true,
    "**/temp/**": true
  },
  "files.exclude": {
    "**/.git": true,
    "**/.svn": true,
    "**/.hg": true,
    "**/CVS": true,
    "**/.DS_Store": true,
    "**/Thumbs.db": true,
    "**/node_modules": true,
    "**/dist": true,
    "**/.nx": true,
    "**/.turbo": true,
    "**/.vitest": true,
    "**/coverage": true,
    "**/mcp-servers": true,
    "**/__pycache__": true,
    "**/.pytest_cache": true,
    "**/.ruff_cache": true,
    "**/.mypy_cache": true,
    "**/.coverage": true,
    "**/.vscode-test": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/bower_components": true,
    "**/*.code-search": true,
    "**/dist": true,
    "**/.nx": true,
    "**/.turbo": true,
    "**/.vitest": true,
    "**/coverage": true,
    "**/mcp-servers": true,
    "**/__pycache__": true,
    "**/.pytest_cache": true,
    "**/.ruff_cache": true,
    "**/.mypy_cache": true,
    "**/.coverage": true,
    "**/tmp": true,
    "**/temp": true
  },

  // --- EXTENSIONS - ALL DISABLED -------------------------------------------
  "eslint.enable": false,
  "eslint.run": "onType",
  "eslint.validate": [],
  "prettier.enable": false,
  "prettier.requireConfig": false,
  "editor.codeActionsOnSave": {},
  "python.linting.enabled": false,
  "python.analysis.typeCheckingMode": "off",
  "python.analysis.autoImportCompletions": false,
  "python.linting.pylintEnabled": false,
  "python.linting.flake8Enabled": false,
  "python.linting.mypyEnabled": false,
  "github.copilot.enable": {
    "*": false,
    "yaml": false,
    "plaintext": false,
    "markdown": false,
    "scminput": false
  },
  "gitlens.enabled": false,
  "git.autofetch": false,
  "git.enableSmartCommit": false,

  // --- TERMINAL MINIMAL ----------------------------------------------------
  "terminal.integrated.scrollback": 100,
  "terminal.integrated.enableImages": false,
  "terminal.integrated.enableVisualBell": false,
  "terminal.integrated.smoothScrolling": false,
  "terminal.integrated.stickyScroll.enabled": false,
  "terminal.integrated.gpuAcceleration": "off",

  // --- DEBUG DISABLED ------------------------------------------------------
  "debug.openDebug": "neverOpen",
  "debug.inlineValues": "off",
  "debug.toolBarLocation": "hidden",
  "debug.enableAllHovers": false,
  "debug.showInStatusBar": "never",

  // --- LANGUAGE SPECIFIC - NO FORMATTERS -----------------------------------
  "[typescript]": {
    "editor.defaultFormatter": null,
    "editor.formatOnSave": false,
    "editor.codeActionsOnSave": {}
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": null,
    "editor.formatOnSave": false,
    "editor.codeActionsOnSave": {}
  },
  "[javascript]": {
    "editor.defaultFormatter": null,
    "editor.formatOnSave": false
  },
  "[json]": {
    "editor.defaultFormatter": null,
    "editor.formatOnSave": false
  },
  "[jsonc]": {
    "editor.defaultFormatter": null,
    "editor.formatOnSave": false
  },
  "[python]": {
    "editor.defaultFormatter": null,
    "editor.formatOnSave": false,
    "editor.codeActionsOnSave": {}
  },
  "[markdown]": {
    "editor.defaultFormatter": null,
    "editor.formatOnSave": false,
    "editor.wordWrap": "off"
  },
  "[yaml]": {
    "editor.defaultFormatter": null,
    "editor.formatOnSave": false
  },
  "[shellscript]": {
    "editor.defaultFormatter": null,
    "editor.formatOnSave": false
  },

  // --- PERFORMANCE SETTINGS -------------------------------------------------
  "security.workspace.trust.enabled": false,
  "workbench.editor.revealIfOpen": false,
  "workbench.editor.decorations.colors": false,
  "workbench.editor.decorations.badges": false,
  "workbench.editor.closeOnFileDelete": false,
  "workbench.commandPalette.history": 0,
  "workbench.iconTheme": null,
  "workbench.productIconTheme": "default"
}
EOF

# Disable extensions completely
echo "🔫 Disabling all extensions..."
cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [],
  "unwantedRecommendations": [
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-json",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "biomejs.biome",
    "bradlc.vscode-tailwindcss",
    "ms-python.python",
    "ms-python.black-formatter",
    "charliermarsh.ruff",
    "GitHub.copilot",
    "GitHub.copilot-chat",
    "ms-vscode.vscode-eslint",
    "ms-vscode.vscode-docker",
    "redhat.vscode-yaml",
    "streetsidesoftware.code-spell-checker",
    "yzhang.markdown-all-in-one",
    "ms-vscode.vscode-markdown",
    "ms-vscode.hexeditor",
    "ms-vscode.vscode-git",
    "eamodio.gitlens"
  ]
}
EOF

# Create minimal launch.json to disable debugging
cat > .vscode/launch.json << 'EOF'
{
  "version": "0.2.0",
  "configurations": []
}
EOF

# Create empty tasks.json
echo "{}" > .vscode/tasks.json

# Update .gitignore to exclude performance files
cat >> .gitignore << 'EOF'

# VS Code performance files
.vscode/.tscache
.vscode/typescript*
.vscode/.extensions
.vscode/.logs
.vscode/.test
.vscode/settings.backup.json
.vscode/settings.optimized.json
.vscode/performance.json
emergency-code.sh
EOF

echo ""
echo "✅ Complete VS Code recovery applied!"
echo ""
echo "🔧 What was done:"
echo "   • Killed all VS Code processes"
echo "   • Cleared ALL VS Code caches"
echo "   • Disabled ALL extensions"
echo "   • Set TypeScript memory to 512MB"
echo "   • Disabled all IntelliSense features"
echo "   • Disabled all auto-formatting"
echo "   • Minimized file watching"
echo ""
echo "🚀 To restart VS Code:"
echo "   • Open normally: open -a 'Visual Studio Code' ."
echo "   • Or double-click folder in Finder"
echo ""
echo "⚠️  Note: VS Code is in EMERGENCY mode."
echo "    Features disabled for maximum performance."
echo ""
echo "🔄 To restore features later:"
echo "   ./scripts/restore-vscode.sh"