#!/bin/bash

# Emergency VS Code performance recovery for Cortex-OS
echo "🚨 EMERGENCY VS Code Recovery - Maximum Performance Mode"

# Kill all VS Code processes
echo "🔧 Stopping all VS Code processes..."
pkill -f "Visual Studio Code" || true
pkill -f "code" || true
sleep 2

# Clear ALL VS Code caches
echo "🧹 Clearing all VS Code caches..."
rm -rf ~/.vscode-server/server-*-*/extensions/*/node_modules/.cache
rm -rf ~/.vscode-server/server-*-*/out/*
rm -rf ~/.vscode/extensions/*/node_modules/.cache
rm -rf ~/.vscode-oss-dev/*/extensions/*/node_modules/.cache
rm -rf .vscode/.vscode-test-web
rm -rf .vscode/.tscache
rm -rf .vscode/typescript*
rm -rf .vscode/.extensions
rm -rf .vscode/.logs

# Disable ALL extensions globally
echo "🔫 Disabling all extensions..."
code --list-extensions | while read ext; do
    code --disable-extension "$ext" 2>/dev/null || true
done

# Create ultra-minimal settings
echo "⚡ Creating ultra-minimal configuration..."
cat > .vscode/settings.json << 'EOF'
{
  // --- EMERGENCY PERFORMANCE MODE -----------------------------------------
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
  "workbench.sidebar.location": "left",
  "workbench.activityBar.visible": false,
  "workbench.statusBar.visible": true,
  "workbench.colorTheme": "Default High Contrast",

  // --- MINIMAL EDITOR CONFIGURATION -----------------------------------------
  "editor.fontSize": 12,
  "editor.fontFamily": "Monaco, monospace",
  "editor.lineHeight": 1.2,
  "editor.fontLigatures": false,
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
  "editor.experimental.asyncTokenization": true,
  "editor.maxTokenizationLineLength": 1000,
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
  "editor.formatOnPaste": false,
  "editor.quickSuggestions": false,
  "editor.parameterHints.enabled": false,
  "editor.suggest.showStatusBar": false,
  "editor.suggestSelection": "first",
  "editor.wordBasedSuggestions": false,
  "editor.suggest.snippetsPreventQuickSuggestions": true,
  "editor.lightbulb.enabled": false,
  "editor.gotoLocation.multipleReferences": "goto",
  "editor.acceptSuggestionOnEnter": "off",
  "editor.tabCompletion": "off",
  "editor.suggestOnTriggerCharacters": false,
  "editor.tabSize": 2,
  "editor.insertSpaces": true,

  // --- TYPESCRIPT MINIMAL SETTINGS -----------------------------------------
  "typescript.tsserver.maxTsServerMemory": 1024,
  "typescript.tsserver.experimental.enableProjectDiagnostics": false,
  "typescript.tsserver.watchOptions": {
    "watchFile": "fixedPollingInterval",
    "watchDirectory": "fixedPollingInterval",
    "fallbackPolling": "dynamicPriorityPolling"
  },
  "typescript.suggest.autoImports": false,
  "typescript.updateImportsOnFileMove.enabled": "never",
  "typescript.preferences.includePackageJsonAutoImports": "off",
  "typescript.disableAutomaticTypeAcquisition": true,
  "typescript.preferences.preferTypeOnlyAutoImports": false,
  "typescript.suggest.completeFunctionCalls": false,
  "typescript.validate.enable": false,
  "javascript.validate.enable": false,

  // --- FILE WATCHING MINIMAL ------------------------------------------------
  "files.autoSave": "off",
  "files.watcherExclude": {
    "**": true
  },
  "files.exclude": {
    "**": true,
    "!**/*.{ts,js,tsx,jsx,json,md,yml,yaml,py,sh}": true,
    "!package.json": true,
    "!tsconfig.json": true,
    "!README.md": true
  },
  "search.exclude": {
    "**": true
  },
  "search.quickOpen.includeSymbols": false,
  "search.smartCase": false,

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

  // --- GIT DISABLED --------------------------------------------------------
  "git.enabled": false,
  "git.autofetch": false,
  "git.enableSmartCommit": false,
  "git.confirmSync": false,
  "git.postCommitCommand": "none",
  "gitlens.enabled": false,

  // --- EXTENSION SETTINGS DISABLED -----------------------------------------
  "eslint.enable": false,
  "prettier.enable": false,
  "python.linting.enabled": false,
  "python.analysis.typeCheckingMode": "off",
  "github.copilot.enable": {
    "*": false
  },

  // --- WORKSPACE MINIMAL ----------------------------------------------------
  "workbench.editor.enablePreview": false,
  "workbench.editor.showTabs": false,
  "workbench.editor.tabCloseButton": "off",
  "workbench.editor.revealIfOpen": false,
  "workbench.editor.decorations.colors": false,
  "workbench.editor.decorations.badges": false,
  "workbench.editor.closeOnFileDelete": false,

  // --- LANGUAGE SPECIFIC MINIMAL --------------------------------------------
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
  }
}
EOF

# Create emergency launch script
cat > emergency-code.sh << 'EOF'
#!/bin/bash
# Emergency VS Code launch with minimal resources
exec code \
  --disable-extensions \
  --disable-gpu \
  --max-memory=1024 \
  --user-data-dir=/tmp/vscode-emergency \
  --extensions-dir=/tmp/vscode-emergency-extensions \
  --crash-reporter-id=emergency \
  "$@"
EOF
chmod +x emergency-code.sh

# Create .vscodeignore to exclude everything except essentials
cat > .vscode/.vscodeignore << 'EOF'
# Emergency VS Code ignore file
**/*
!*.json
!*.md
!*.ts
!*.js
!*.py
!*.sh
!package.json
!tsconfig.json
!nx.json
!.vscode/settings.json
!.vscode/extensions.json
!.vscode/launch.json
!.vscode/tasks.json
EOF

echo ""
echo "✅ EMERGENCY RECOVERY COMPLETE!"
echo ""
echo "🚨 VS Code has been configured for MAXIMUM performance:"
echo "   • All extensions disabled"
echo "   • All IntelliSense disabled"
echo "   • TypeScript memory limited to 1GB"
echo "   • File watching minimized"
echo "   • All visual effects disabled"
echo ""
echo "📋 Next steps:"
echo "1. Close all VS Code instances"
echo "2. Restart with: ./emergency-code.sh ."
echo "3. OR use regular 'code .' with minimal configuration"
echo ""
echo "⚠️  Note: Many features are disabled for performance."
echo "    Use './scripts/restore-vscode.sh' to restore when needed."