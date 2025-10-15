# 🚀 Quick Reference: VS Code Workspaces

## 📍 Storage Locations

### Main Workspace
```
/Users/jamiecraik/.Cortex-OS/cortex-os.code-workspace
```

### Specialized Workspaces
```
/Users/jamiecraik/.Cortex-OS/workspaces/
```

## 🎯 Quick Open Commands

```bash
cd /Users/jamiecraik/.Cortex-OS

# Main workspace (general development)
code cortex-os.code-workspace

# Specialized workspaces
code workspaces/agents-dev.code-workspace       # Agents & Orchestration
code workspaces/mcp-dev.code-workspace          # MCP Protocol & Server
code workspaces/rag-memory-dev.code-workspace   # RAG & Memory Systems
code workspaces/observability-dev.code-workspace # Monitoring & Telemetry
code workspaces/security-dev.code-workspace     # Security & Policies
code workspaces/testing-dev.code-workspace      # Testing & TDD
code workspaces/apps-dev.code-workspace         # Applications & Dashboards
code workspaces/gateway-dev.code-workspace      # Gateway & Routing
```

## 🗂️ Workspace Contents

| Workspace | Focus Area | Package Count |
|-----------|------------|---------------|
| **agents-dev** | Agents, Orchestration, Workflows | 7 packages |
| **mcp-dev** | MCP Protocol, Server, Auth | 7 packages |
| **rag-memory-dev** | RAG, Memory, Knowledge | 6 packages |
| **observability-dev** | A2A, Telemetry, Logging | 6 packages |
| **security-dev** | Security, Policies, Auth | 6 packages |
| **testing-dev** | Testing, TDD, Evals | 6 packages |
| **apps-dev** | Apps, Dashboards, UI | 5 packages |
| **gateway-dev** | Gateways, Routing, Connectors | 5 packages |

## ⚡ Performance Impact

| Metric | Full Repo | Workspace | Improvement |
|--------|-----------|-----------|-------------|
| Files | 137,636 | ~10,000 | **93% ↓** |
| Startup | 45-60s | 5-10s | **85% ↓** |
| CPU | 12-15% | 2-4% | **70% ↓** |
| Memory | 1.8GB | 600MB | **67% ↓** |

## 💡 Pro Tips

### Daily Workflow
1. **Pick your workspace** based on what you're working on
2. **Open it directly** (don't open the root folder!)
3. **Switch workspaces** when changing focus areas

### Performance
- ✅ **DO**: Use specialized workspaces
- ✅ **DO**: Keep only 1 workspace open at a time
- ❌ **DON'T**: Open the root folder (`/Users/jamiecraik/.Cortex-OS`)
- ❌ **DON'T**: Open multiple workspaces simultaneously

### Troubleshooting
```bash
# If still slow, restart TypeScript server:
Cmd+Shift+P → "TypeScript: Restart TS Server"

# Nuclear option - clear all caches:
./scripts/fix-vscode-performance.sh
```

## 📚 Documentation

- **Full Guide**: `workspaces/README.md`
- **Performance Details**: `WORKSPACE-PERFORMANCE.md`
- **Setup Script**: `scripts/fix-vscode-performance.sh`

---

**Quick Link**: `code workspaces/` to see all options!
