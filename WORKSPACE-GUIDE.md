# 🚀 Complete VS Code Workspace Guide

## 📁 All Available Workspaces

### 1. **MCP Development** (9 packages)
```bash
code workspaces/mcp-dev.code-workspace
```
**Complete MCP Stack:**
- 📦 MCP (Main)
- 📦 MCP Server
- 📦 MCP Bridge
- 📦 MCP Auth
- 📦 MCP Registry
- 📦 MCP Core
- 📦 Cortex MCP
- 📚 MCP Contracts
- 🔌 MCP Servers

**Use for:** All MCP protocol work, server development, authentication, registry, and server implementations

---

### 2. **A2A Development** (11 packages) ✨ NEW
```bash
code workspaces/a2a-dev.code-workspace
```
**Complete A2A Stack:**
- 📦 A2A (Main)
- 📦 A2A Core
- 📦 A2A Contracts
- 📦 A2A Transport
- 📦 A2A Events
- 📦 A2A Handlers
- 📦 A2A Observability
- 📦 A2A Examples
- 🐍 A2A Python Workers
- 📦 A2A Services
- 📚 A2A Contracts (Libs)

**Use for:** All agent-to-agent communication, event handling, transport layer, and messaging

---

### 3. **Agents Development** (7 packages)
```bash
code workspaces/agents-dev.code-workspace
```
**Includes:**
- 📦 Agents
- 📦 Orchestration
- 📦 Workflow Orchestrator
- 📦 Workflow Common
- 📦 Executor Spool
- 📦 Agent Toolkit
- 📚 Agent Contracts

**Use for:** Agent development, workflow orchestration, executor logic

---

### 4. **RAG & Memory** (6 packages)
```bash
code workspaces/rag-memory-dev.code-workspace
```
**Includes:**
- 📦 RAG Core
- 📦 RAG HTTP
- 📦 Memories
- 📦 Memory Core
- 📦 Memory REST API
- 📦 History Store

**Use for:** RAG implementation, memory management, knowledge systems

---

### 5. **Observability** (6 packages)
```bash
code workspaces/observability-dev.code-workspace
```
**Includes:**
- 📦 A2A Core (monitoring aspects)
- 📦 A2A Services
- 📦 Observability
- 📦 Telemetry
- 📦 Cortex Logging
- 📦 Hooks

**Use for:** Monitoring, telemetry, logging, event systems

---

### 6. **Security** (6 packages)
```bash
code workspaces/security-dev.code-workspace
```
**Includes:**
- 📦 Security
- 📦 Cortex Sec
- 📦 Policy
- 📦 MCP Auth
- 📦 Semgrep Integration
- 🔧 Security Infrastructure

**Use for:** Security features, policies, authentication, compliance

---

### 7. **Testing** (6 packages)
```bash
code workspaces/testing-dev.code-workspace
```
**Includes:**
- 📦 Testing
- 📦 TDD Coach
- 📦 Evals
- 📦 Simlab
- 🧪 Tests
- 🧪 Simple Tests

**Use for:** Test development, TDD, evaluations, simulations

---

### 8. **Apps** (5 packages)
```bash
code workspaces/apps-dev.code-workspace
```
**Includes:**
- 🚀 Cortex OS Main
- 🚀 Dashboard
- 🚀 ChatGPT Dashboard
- 🚀 CBOM Viewer
- 📦 Workflow Dashboard

**Use for:** Application development, UI/dashboards

---

### 9. **Gateway & Routing** (5 packages)
```bash
code workspaces/gateway-dev.code-workspace
```
**Includes:**
- 📦 Model Gateway
- 📦 Gateway
- 📦 Router
- 📦 Connectors
- 📦 OpenAI Apps SDK

**Use for:** API gateways, routing, model integration, connectors

---

### 10. **Main Workspace** (8 packages)
```bash
code cortex-os.code-workspace  # (at root level)
```
**General Purpose - Key Packages:**
- 📦 Agents
- 📦 RAG
- 📦 MCP
- 📦 Orchestration
- 📦 Memories
- 🚀 Cortex OS App
- 📚 TypeScript Libs
- 🔧 Root (Config Files)

**Use for:** Cross-package development, general work

---

## 🎯 Which Workspace Should I Use?

### By Task

| Task | Workspace |
|------|-----------|
| Working on MCP protocol/servers | `mcp-dev` |
| Agent-to-agent messaging | `a2a-dev` |
| Agent orchestration/workflows | `agents-dev` |
| RAG or memory systems | `rag-memory-dev` |
| Adding telemetry/logging | `observability-dev` |
| Security features | `security-dev` |
| Writing tests | `testing-dev` |
| Building dashboards | `apps-dev` |
| Gateway/routing | `gateway-dev` |
| Cross-cutting changes | `cortex-os` (main) |

### By Package

**Looking for a specific package?**
```bash
# Quick search
grep -r "package-name" workspaces/*.code-workspace
```

**Common packages:**
- `mcp-server` → `mcp-dev`
- `a2a-core` → `a2a-dev`
- `agents` → `agents-dev`
- `rag` → `rag-memory-dev`
- `observability` → `observability-dev`
- `security` → `security-dev`

## 📊 Performance Comparison

| Workspace | Packages | Est. Files | Startup Time |
|-----------|----------|------------|--------------|
| **mcp-dev** | 9 | ~8,000 | 6-8s |
| **a2a-dev** | 11 | ~10,000 | 7-9s |
| **agents-dev** | 7 | ~7,000 | 5-7s |
| **Full Monorepo** | 60+ | 137,636 | 45-60s ❌ |

## 💡 Pro Tips

### Switching Workspaces
```bash
# Close current VS Code (Cmd+Q)
# Open new workspace
code workspaces/mcp-dev.code-workspace
```

### Finding Your Current Workspace
In VS Code: Look at the window title or check File → Open Recent

### Customizing
Edit any `.code-workspace` file to add/remove folders

### Multiple Workspaces
Can open 2+ workspaces in separate VS Code windows, but performance will decrease

## 🆘 Troubleshooting

### Still Slow?
1. Check you're using a workspace file (not root folder)
2. Restart TypeScript: `Cmd+Shift+P` → "TypeScript: Restart TS Server"
3. Check process monitor: Activity Monitor → search "Code"
4. Run: `./scripts/fix-vscode-performance.sh`

### Package Not Found?
Some packages may be nested. Check:
```bash
find packages -name "package-name" -type d
```

## 📚 Related Documentation

- **Quick Reference**: `WORKSPACES-QUICK-REFERENCE.md`
- **Full Guide**: `workspaces/README.md`
- **Performance**: `WORKSPACE-PERFORMANCE.md`

---

**Total Workspaces**: 10 (9 specialized + 1 main)  
**Total Packages Covered**: 60+  
**Performance Gain**: 85-93% faster startup  
**Updated**: 2025-01-14
