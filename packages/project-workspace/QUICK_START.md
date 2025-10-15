# 🚀 Project Workspace Quick Start

## What is This?

This is a **unified workspace** that gives you centralized access to Cortex-OS project infrastructure files that are normally scattered across the monorepo root.

## 📍 Open This Workspace

### In VS Code / IDE:
```bash
code /Users/jamiecraik/.Cortex-OS/packages/project-workspace
```

### Or from terminal:
```bash
cd /Users/jamiecraik/.Cortex-OS/packages/project-workspace
```

## 📂 What You Can Access

| Directory | What's Inside | Access Via |
|-----------|---------------|------------|
| **`.cortex/`** | Agent configs, commands, audit logs, constitutional compliance | `cd .cortex/` |
| **`.github/`** | GitHub Actions, workflows, issue templates, CODEOWNERS | `cd .github/` |
| **`tasks/`** | Active task directories, TDD plans, integration roadmaps | `cd tasks/` |
| **`project-documentation/`** | Performance reviews, implementation summaries, reports | `cd project-documentation/` |

## 🔍 Quick Commands

### View Workspace Info
```bash
pnpm --filter @cortex-os/project-workspace run info
# or directly:
node info.js
```

### Search Across All Directories
```bash
# Using ripgrep (fast)
rg "search-term" .cortex/
rg "MCP" tasks/

# Using grep
grep -r "search-term" .cortex/
```

### Navigate Directories
```bash
# From project-workspace directory:
cd .cortex/
cd .github/workflows/
cd tasks/arxiv-mcp-tool-integration/
cd project-documentation/
```

### List Contents
```bash
ls -la .cortex/
tree tasks/ -L 2
find .github/ -name "*.yml"
```

## 🎯 Common Use Cases

### 1. Check Active Tasks
```bash
ls -la tasks/
```

### 2. Review Project Documentation
```bash
cd project-documentation/
ls -la *.md
```

### 3. Inspect GitHub Workflows
```bash
cd .github/workflows/
ls -la
```

### 4. Access Agent Configurations
```bash
cd .cortex/agents/
```

### 5. View Constitutional Compliance
```bash
cat .cortex/constitutional-compliance-verified.log
```

## 🛠️ Maintenance

### Refresh Symlinks
If symlinks break or need updating:
```bash
./setup-links.sh
```

### Update Workspace
```bash
cd /Users/jamiecraik/.Cortex-OS/packages/project-workspace
git pull
pnpm install
```

## 💡 Pro Tips

1. **Use IDE Search**: Your IDE's workspace search now covers all these directories
2. **Symlinks are Local**: They're gitignored, so they won't be committed
3. **Relative Paths Work**: You can also use `../../.cortex/` from any package
4. **Multiple Workspaces**: You can open this alongside other package workspaces

## 🔗 Related Workspaces

- **Monorepo Root**: `/Users/jamiecraik/.Cortex-OS` - Access to everything
- **Agents**: `/Users/jamiecraik/.Cortex-OS/packages/agents` - Agent implementation
- **MCP**: `/Users/jamiecraik/.Cortex-OS/packages/mcp` - Current package

## 📚 Next Steps

1. Open this workspace in your IDE
2. Run `node info.js` to see current status
3. Explore the directories via symlinks
4. Use IDE's search to find content across all directories

---

**Created**: October 2025  
**Maintained by**: Cortex-OS Team
