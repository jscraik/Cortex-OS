# Cortex-OS Memory Architecture - Clear Overview

**Last Updated**: 2025-10-11  
**Status**: Authoritative Reference

## Executive Summary

Cortex-OS provides memory access through **TWO independent services** that share the same backend storage but serve different purposes and use cases.

---

## The Two Services

### 1. MCP Server (PRIMARY) ⭐

**Location**: `packages/mcp-server`  
**Port**: 3024  
**Status**: Already running and functional  
**Protocol**: MCP (Model Context Protocol)

**What it does:**
- Provides MCP protocol tools for AI assistants and IDEs
- Supports STDIO transport (Claude Desktop)
- Supports HTTP/SSE transport (ChatGPT)
- Direct integration with memory-core library

**Used by:**
- ✅ Claude Desktop
- ✅ ChatGPT Desktop  
- ✅ VS Code with MCP
- ✅ Cursor with MCP
- ✅ Any MCP-compatible client

**Tools provided:**
- `memory.store` - Store memories
- `memory.search` - Search memories
- `memory.analysis` - Analyze patterns
- `memory.relationships` - Find connections
- `memory.stats` - Get statistics
- `memory.hybrid_search` - Combined search

**Configuration**: See `packages/mcp-server/README.md`

---

### 2. REST API Server (OPTIONAL)

**Location**: `apps/cortex-os/packages/local-memory`  
**Port**: 3028  
**Status**: Start on-demand  
**Protocol**: HTTP REST

**What it does:**
- Provides HTTP REST endpoints for memory operations
- Alternative to MCP protocol for custom applications
- Same functionality as MCP server, different interface

**Used by:**
- Custom applications without MCP support
- Direct HTTP/REST integrations
- Legacy systems
- Non-MCP testing tools

**Endpoints provided:**
- `POST /memory/store` - Store memories
- `POST /memory/search` - Search memories
- `POST /memory/analysis` - Analyze patterns
- `POST /memory/relationships` - Find connections
- `POST /memory/stats` - Get statistics
- `GET /healthz` - Health check

**Configuration**: See `apps/cortex-os/packages/local-memory/README.md`

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                      │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Claude       │ ChatGPT      │ VS Code      │ Custom Apps    │
│ Desktop      │ Desktop      │ (MCP)        │ (HTTP/REST)    │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────┘
       │              │              │                 │
       │ MCP/STDIO    │ MCP/SSE      │ MCP/HTTP       │ HTTP/REST
       │              │              │                 │
┌──────┴──────────────┴──────────────┴───────┐  ┌─────┴──────────┐
│        MCP Server (PRIMARY)                │  │  REST API      │
│        Port: 3024                          │  │  (OPTIONAL)    │
│        packages/mcp-server                 │  │  Port: 3028    │
│                                            │  │  local-memory  │
│  ✓ Already running                         │  │  Start when    │
│  ✓ MCP protocol                            │  │  needed        │
│  ✓ STDIO/HTTP/SSE transports               │  │                │
└──────────────────────┬─────────────────────┘  └────────┬───────┘
                       │                                  │
                       └──────────────┬───────────────────┘
                                      │
                          ┌───────────▼────────────┐
                          │   Memory Core Backend  │
                          │   (@cortex-os/         │
                          │    memory-core)        │
                          │                        │
                          │  • SQLite Database     │
                          │  • Qdrant Vectors      │
                          │  • Embeddings          │
                          │  • Search Engine       │
                          └────────────────────────┘
```

---

## Key Differences

| Feature | MCP Server | REST API Server |
|---------|-----------|-----------------|
| **Primary Use** | AI assistants & IDEs | Custom applications |
| **Protocol** | MCP | HTTP REST |
| **Port** | 3024 | 3028 |
| **Status** | Always running | On-demand |
| **Transport** | STDIO, HTTP, SSE | HTTP only |
| **Clients** | Claude, ChatGPT, IDEs | Any HTTP client |
| **Configuration** | `packages/mcp-server` | `local-memory` package |
| **Startup** | Automatic (LaunchAgent) | Manual or autostart |

---

## Common Misconceptions

### ❌ Myth: "Dual Mode" means MCP + REST running together
**✅ Reality**: "Dual mode" refers to the MCP Server supporting both STDIO and HTTP/SSE transports. The REST API is a completely separate optional service.

### ❌ Myth: You need both services running
**✅ Reality**: Most users only need the MCP Server (port 3024). The REST API (port 3028) is optional and only for non-MCP use cases.

### ❌ Myth: They duplicate data
**✅ Reality**: Both services use the exact same memory-core backend. There's no data duplication - they're just different interfaces to the same storage.

### ❌ Myth: The REST API provides MCP integration
**✅ Reality**: The REST API only provides HTTP endpoints. For MCP protocol, you must use the MCP Server.

---

## Which Service Do I Need?

### Use MCP Server (3024) if you want to:
- ✅ Use Claude Desktop
- ✅ Use ChatGPT Desktop
- ✅ Use VS Code with MCP extension
- ✅ Use Cursor with MCP support
- ✅ Follow standard MCP protocol
- ✅ Use the recommended interface

**This is what most users need.**

### Use REST API Server (3028) if you want to:
- Build custom applications without MCP support
- Use HTTP REST directly
- Integrate with legacy systems
- Test with tools like curl/Postman
- Have specific REST API requirements

**This is optional for specialized use cases.**

---

## Current Status

### MCP Server (Port 3024)
- ✅ **Running**: Yes
- ✅ **Functional**: Yes
- ✅ **Accessible**: Via MCP protocol
- ✅ **Clients**: Claude Desktop, ChatGPT, etc.
- ✅ **Memory Tools**: All working

### REST API Server (Port 3028)
- ⏸️ **Running**: No (start on-demand)
- ⏸️**Functional**: Yes (when started)
- ⏸️ **Accessible**: When running
- ℹ️ **Purpose**: Optional alternative interface

---

## Port Registry

From `config/ports.env`:

```bash
# MCP Server (PRIMARY)
CORTEX_MCP_PORT=3024              # MCP protocol server

# REST API (OPTIONAL)
MEMORY_API_PORT=3028              # REST API server
LOCAL_MEMORY_BASE_URL=http://127.0.0.1:3028

# Note: These are separate services using shared backend
```

---

## How to Use Each Service

### Using MCP Server (Recommended)

**Already configured and running!**

Access memory through MCP tools:
- `memory.store` - Store new memories
- `memory.search` - Search existing memories
- `memory.analysis` - Analyze patterns
- And more...

See `packages/mcp-server/README.md` for details.

### Using REST API Server (Optional)

**Start when needed:**

```bash
cd apps/cortex-os/packages/local-memory
pnpm start:service
```

Access via HTTP:
```bash
# Health check
curl http://127.0.0.1:3028/healthz

# Store memory
curl -X POST http://127.0.0.1:3028/memory/store \
  -H 'Content-Type: application/json' \
  -d '{"content":"...", "importance":8}'
```

See `apps/cortex-os/packages/local-memory/README.md` for details.

---

## Quick Decision Tree

```
Do you need memory access?
│
├─ For AI assistants (Claude, ChatGPT)?
│  └─ Use MCP Server (port 3024) ✅ Already running
│
├─ For IDEs with MCP support (VS Code, Cursor)?
│  └─ Use MCP Server (port 3024) ✅ Already running
│
├─ For custom apps without MCP support?
│  └─ Use REST API Server (port 3028) ⏸️ Start on-demand
│
└─ Not sure?
   └─ Use MCP Server (port 3024) ✅ Recommended
```

---

## Documentation References

### MCP Server (Primary)
- Main README: `packages/mcp-server/README.md`
- Operational Status: `packages/mcp-server/OPERATIONAL_STATUS.md`
- Port: 3024
- Status: Production Ready

### REST API Server (Optional)
- Main README: `apps/cortex-os/packages/local-memory/README.md`
- Setup Guide: `apps/cortex-os/packages/local-memory/docs/SETUP.md`
- Port: 3028
- Status: Optional Service

### Port Configuration
- Central Registry: `config/ports.env`
- Port Assignments: Documented and enforced

---

## Summary

- **MCP Server (3024)**: Primary interface, already running, use for AI assistants and IDEs
- **REST API (3028)**: Optional interface, start on-demand, use for custom HTTP apps
- **Both**: Share the same memory-core backend storage
- **Most Users**: Only need the MCP Server

**If in doubt, use the MCP Server - it's already running and provides everything you need!**

---

**brAInwav Development Team**  
**Cortex-OS Memory Architecture**  
**Last Updated**: 2025-10-11
