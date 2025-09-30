# brAInwav VS Code Extensions Sync Research

- **Date**: 2025-09-30
- **Goal**: Align `.vscode/extensions.json` recommendations with the extensions currently installed in the brAInwav Cortex-OS workspace.
- **Environment**: macOS, VS Code CLI `code --list-extensions`

## Current Extensions Installed

```text
1password.op-vscode
1yib.rust-bundle
anthropic.claude-code
austenc.tailwind-docs
automatalabs.copilot-mcp
biomejs.biome
bradlc.vscode-tailwindcss
charliermarsh.ruff
christian-kohler.npm-intellisense
christian-kohler.path-intellisense
davidanson.vscode-markdownlint
davidbwaters.macos-modern-theme
dbaeumer.vscode-eslint
detachhead.basedpyright
dsznajder.es7-react-js-snippets
dustypomerleau.rust-syntax
eamodio.gitlens
fill-labs.dependi
github.copilot
github.copilot-chat
github.vscode-github-actions
github.vscode-pull-request-github
google.gemini-cli-vscode-ide-companion
graphite.gti-vscode
hfloveyy.langgraphv
humao.rest-client
hverlin.mise-vscode
mikestead.dotenv
ms-azuretools.vscode-containers
ms-azuretools.vscode-docker
ms-mssql.data-workspace-vscode
ms-mssql.mssql
ms-mssql.sql-bindings-vscode
ms-mssql.sql-database-projects-vscode
ms-playwright.playwright
ms-python.debugpy
ms-python.mypy-type-checker
ms-python.python
ms-python.vscode-python-envs
ms-vscode-remote.remote-containers
ms-vscode.makefile-tools
ms-vscode.vscode-typescript-next
mtxr.sqltools
nrwl.angular-console
openai.chatgpt
pkief.material-icon-theme
redhat.vscode-yaml
rust-lang.rust-analyzer
sethford.mcp-figma-extension
sonarsource.sonarlint-vscode
streetsidesoftware.code-spell-checker
tamasfe.even-better-toml
upstash.context7-mcp
yzhang.markdown-all-in-one
```

## Existing Repository Configuration

- `.vscode/extensions.json` currently recommends a limited subset (`biomejs.biome`, `ms-vscode.vscode-typescript-next`, `nrwl.nx-console`).
- The file also marks `ms-vscode.vscode-eslint` as unwanted despite the modern workflow using `dbaeumer.vscode-eslint`.

## Considerations

- Recommendations should reflect the active toolchain (Docker-first dev workflow, brAInwav branding, MCP integrations).
- Maintain ASCII formatting and keep array entries alphabetized for easier diff review.
- Ensure no obsolete OrbStack references remain while updating this developer tooling guidance.
