# brAInwav VS Code Settings Sync Research

- **Date**: 2025-09-30
- **Goal**: Align workspace `.vscode/settings.json` with the current VS Code Insiders user settings to keep the repository guidance accurate.
- **Source**: `~/Library/Application Support/Code - Insiders/User/settings.json`

## Observed User Settings Snapshot

```json
{
  "workbench.colorTheme": "MacOS Modern Dark - Xcode Modern",
  "workbench.iconTheme": "material-icon-theme",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": "explicit",
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "editor.defaultFormatter": "biomejs.biome",
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.suggest.autoImports": true,
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "eslint.enable": true,
  "eslint.run": "onSave",
  "eslint.validate": [
    "typescript",
    "typescriptreact"
  ],
  "python.analysis.typeCheckingMode": "strict",
  "python.defaultInterpreterPath": "/opt/homebrew/bin/python3",
  "files.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/coverage": true
  },
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 30000,
  "terminal.integrated.fontFamily": "JetBrains Mono, monospace",
  "github.copilot.enable": {
    "*": true,
    "plaintext": false
  },
  "material-icon-theme.files.associations": {
    "RULES_OF_AI.md": "lock",
    "AGENTS.md": "robot"
  }
  // … numerous additional keys covering theming, icon associations, accessibility, GitLens, chat, etc.
}
```

## Current Workspace Settings Snapshot

```json
{
  "security.workspace.trust.enabled": false,
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.defaultFormatter": "biomejs.biome",
  "editor.codeActionsOnSave": {
    "source.organizeImports.biome": "explicit"
  },
  "python.defaultInterpreterPath": "/Users/jamiecraik/.local/share/mise/installs/python/3.12.6/bin/python",
  "python.analysis.typeCheckingMode": "off",
  "nxConsole.enableTelemetry": false,
  "ruff.configuration": "/Users/jamiecraik/.Cortex-OS/config/pyproject.toml"
  // … Cortex-specific formatter overrides for TS/JSON, Dependibot settings, SonarLint project binding, etc.
}
```

## Key Differences

- **Code Actions**: User settings request `source.fixAll*` while workspace limits to Biome organize imports.
- **Python Tooling**: User settings rely on Homebrew interpreter + strict type checking; workspace pins Mise-managed
  interpreter and disables type checking to avoid noisy diagnostics.
- **Formatting Overrides**: User settings favor Prettier for TS/JS/JSON, while workspace enforces TypeScript and Biome defaults per repo standards.
- **Theming/UX**: User configuration contains extensive theme, icon, and accessibility entries absent from workspace file.
- **File associations & excludes**: User settings define large sets for material-icon-theme and file filters that may be overkill
  for workspace but reflect current environment.

## Considerations

- Maintain repository-specific tooling requirements (Biome, Ruff config, SonarLint binding) when merging.
- Ensure paths remain valid across collaborators (avoid hardcoding user-only paths unless unavoidable).
- Preserve ASCII formatting and two-space indentation in JSON output.
