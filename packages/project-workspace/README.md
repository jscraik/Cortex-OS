# Project Workspace

Unified workspace for accessing Cortex-OS project infrastructure, documentation, and governance files.

## 📂 Accessible Directories

This workspace provides organized access to:

### `.cortex/` - Project Configuration & Governance

- Agent configurations
- Audit logs
- Commands and tooling
- Project context and documentation
- Constitutional compliance logs

**Path:** `../../.cortex/`

### `.github/` - GitHub Configuration

- GitHub Actions workflows
- Issue and PR templates
- CODEOWNERS
- Dependabot configuration
- GitHub-specific instructions

**Path:** `../../.github/`

### `tasks/` - Active Tasks & Planning

- Task-specific directories for ongoing work
- TDD implementation plans
- Integration roadmaps
- Performance reviews

**Path:** `../../tasks/`

### `project-documentation/` - Project Documentation

- Ecosystem performance reviews
- Implementation summaries
- MCP integration documentation
- Architecture decision records (ADRs)
- Completion reports

**Path:** `../../project-documentation/`

## 🚀 Usage

### Open in IDE

```bash
# From monorepo root
cd /Users/jamiecraik/.Cortex-OS/packages/project-workspace

# Or open directly in your IDE
code /Users/jamiecraik/.Cortex-OS/packages/project-workspace
```

### Quick Access Commands

```bash
# View workspace info
pnpm --filter @cortex-os/project-workspace run info

# From this directory, access relative paths:
ls -la ../../.cortex/
ls -la ../../.github/
ls -la ../../tasks/
ls -la ../../project-documentation/
```

## 📁 Directory Structure

```
project-workspace/
├── .cortex/              -> ../../.cortex/
├── .github/              -> ../../.github/
├── tasks/                -> ../../tasks/
├── project-documentation/ -> ../../project-documentation/
├── README.md
├── package.json
└── info.js
```

## 🔗 Symlinks

Symlinks are created for easy access:

```bash
# Access via symlinks in this workspace
cd .cortex/
cd .github/
cd tasks/
cd project-documentation/
```

## 💡 Tips

1. **Navigate efficiently**: Use relative paths `../../` to access parent directories
2. **Search across all**: Use IDE's workspace-wide search to find across all directories
3. **Task Management**: Tasks directory contains active work-in-progress
4. **Documentation**: project-documentation contains historical context and reviews
5. **Governance**: .cortex contains project rules and configurations

## 🛠️ Maintenance

To update symlinks or refresh workspace:

```bash
cd /Users/jamiecraik/.Cortex-OS/packages/project-workspace
./setup-links.sh
```
