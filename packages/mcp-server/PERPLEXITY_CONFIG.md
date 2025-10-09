# Perplexity MCP Configuration - brAInwav Cortex Memory Server

**Date:** October 8, 2025  
**Status:** ✅ Ready for Perplexity Connection  
**Server:** brAInwav Cortex Memory MCP Server

---

## 📋 Configuration Options

Perplexity supports two MCP connection methods:

1. **Local MCP (STDIO)** - Recommended for local development
2. **Remote MCP (SSE)** - For cloud-hosted servers via Cloudflare tunnel

---

## Option 1: Local MCP Configuration (STDIO) - RECOMMENDED

This configuration launches the MCP server locally using STDIO transport.

### Configuration JSON

```json
{
  "command": "node",
  "args": [
    "/Users/jamiecraik/.Cortex-OS/packages/mcp-server/dist/index.js"
  ],
  "env": {
    "LOCAL_MEMORY_BASE_URL": "http://localhost:9400",
    "PIECES_MCP_ENABLED": "true",
    "MCP_LOG_LEVEL": "info",
    "PORT": "3024",
    "MCP_HOST": "127.0.0.1"
  }
}
```

### How to Use

1. Open **Perplexity** settings
2. Navigate to **MCP Servers** or **Connectors**
3. Click **"Add Local MCP Server"**
4. Paste the configuration above
5. Name it: **brAInwav Cortex Memory**

---

## Option 2: Remote MCP Configuration (SSE)

⚠️ **Note:** This may have the same compatibility issues as ChatGPT due to FastMCP's Accept header requirements.

### Configuration JSON

```json
{
  "command": "",
  "args": [],
  "env": {
    "MCP_SERVER_URL": "https://cortex-mcp.brainwav.io/mcp"
  }
}
```

**Alternative format (if Perplexity supports direct URL):**

```json
{
  "url": "https://cortex-mcp.brainwav.io/mcp",
  "type": "remote"
}
```

---

## 🔧 Complete Configuration Template (UPDATED)

**Use this configuration** - it includes the STDIO launcher script for reliable startup:

```json
{
  "command": "/Users/jamiecraik/.Cortex-OS/packages/mcp-server/scripts/start-stdio.sh",
  "args": [],
  "env": {
    "LOCAL_MEMORY_BASE_URL": "http://localhost:9400",
    "PIECES_MCP_ENABLED": "false",
    "MCP_LOG_LEVEL": "error"
  }
}
```

**What Changed:** We created a dedicated STDIO launcher script (`scripts/start-stdio.sh`) that:
- Ensures correct working directory for module resolution
- Auto-detects the correct Node.js version
- Sets STDIO transport mode automatically
- Reduces logging for cleaner output

---

## 🎯 Available Tools

Once connected, Perplexity will have access to:

### Core Memory Tools
1. **memory.store** - Store memories with metadata and embeddings
2. **memory.search** - Semantic and keyword search across memories
3. **memory.analysis** - Analyze memory patterns and trends
4. **memory.relationships** - Discover connections between memories
5. **memory.stats** - Retrieve memory statistics and health metrics
6. **memory.hybrid_search** - Query both local and remote memory sources

### Search Tools (Perplexity-Compatible)
7. **search** - Deep research and content discovery
8. **fetch** - Detailed content retrieval by ID

### Remote Pieces Tools (if Pieces is running)
9. **pieces.ask_pieces_ltm** - Query Pieces Long-Term Memory
10. **pieces.create_pieces_memory** - Store in Pieces LTM
11. **pieces.*** - Auto-discovered Pieces tools

---

## ✅ Pre-Configuration Checklist

Before adding to Perplexity, verify:

- [x] MCP server is running: `lsof -i :3024`
- [x] Health check passes: `curl http://localhost:3024/health`
- [x] Node.js is accessible: `which node`
- [x] Dist folder exists: `ls /Users/jamiecraik/.Cortex-OS/packages/mcp-server/dist/`

**Current Status:**
- ✅ Server running on port 3024
- ✅ Health check: "brAInwav Cortex Memory Server - Operational"
- ✅ Cloudflare tunnel active

---

## 🧪 Testing the Connection

### Test 1: Verify Server Availability

```bash
# Check if server is running
lsof -i :3024

# Test health endpoint
curl http://localhost:3024/health
```

### Test 2: Test in Perplexity

After adding the configuration:

1. Start a new chat in Perplexity
2. Ask: "Search my memories for brAInwav development"
3. Perplexity should call the `memory.search` or `search` tool
4. Verify the response includes relevant memories

---

## 🔍 Troubleshooting

### Issue: "Cannot find node"

**Solution:** Use full path to node executable:

```json
{
  "command": "/Users/jamiecraik/.local/share/mise/installs/node/22.19.0/bin/node",
  "args": [
    "/Users/jamiecraik/.Cortex-OS/packages/mcp-server/dist/index.js"
  ],
  "env": {
    "LOCAL_MEMORY_BASE_URL": "http://localhost:9400",
    "PIECES_MCP_ENABLED": "true"
  }
}
```

### Issue: "Server not starting"

**Check:**
1. Dist folder exists: `ls -la /Users/jamiecraik/.Cortex-OS/packages/mcp-server/dist/`
2. Index.js exists: `ls -la /Users/jamiecraik/.Cortex-OS/packages/mcp-server/dist/index.js`
3. Build the server: `cd /Users/jamiecraik/.Cortex-OS/packages/mcp-server && pnpm build`

### Issue: "Module not found"

**Solution:** Ensure dependencies are installed:

```bash
cd /Users/jamiecraik/.Cortex-OS/packages/mcp-server
pnpm install
pnpm build
```

### Issue: "Port 3024 already in use"

**Solution:** Either:
- Stop the existing server: `pkill -f "node.*mcp-server"`
- Use a different port in env: `"PORT": "3025"`

---

## 🌐 Remote MCP Alternative (Advanced)

If local STDIO doesn't work, try remote configuration:

### Step 1: Ensure Server is Running

```bash
# Check server
curl https://cortex-mcp.brainwav.io/health

# Should return: brAInwav Cortex Memory Server - Operational
```

### Step 2: Configure Remote MCP

Perplexity remote MCP configuration format (check Perplexity docs for exact format):

```json
{
  "type": "remote",
  "url": "https://cortex-mcp.brainwav.io/mcp",
  "headers": {
    "Accept": "application/json, text/event-stream",
    "Content-Type": "application/json"
  }
}
```

⚠️ **Note:** Remote configuration may face the same Accept header issues as ChatGPT.

---

## 📊 Server Configuration Details

Your brAInwav Cortex Memory Server is configured as:

```
Transport: HTTP Stream (stateless)
Local Port: 3024
Public URL: https://cortex-mcp.brainwav.io
Cloudflare Tunnel: Active ✅
Node Version: v22.19.0
FastMCP Version: 3.18.0
```

---

## 🎓 Example Use Cases in Perplexity

### Use Case 1: Search Memories

**Prompt:** "Search my memories for brAInwav project information"

**What Happens:**
- Perplexity calls `memory.search` tool
- Returns relevant memories from your brAInwav development
- Perplexity synthesizes the information

### Use Case 2: Store New Information

**Prompt:** "Remember that I need to implement SSE endpoint for ChatGPT compatibility"

**What Happens:**
- Perplexity calls `memory.store` tool
- Stores the information with appropriate metadata
- Confirms storage

### Use Case 3: Analyze Patterns

**Prompt:** "Analyze my development patterns from stored memories"

**What Happens:**
- Perplexity calls `memory.analysis` tool
- Receives pattern analysis
- Provides insights based on the data

---

## 📚 Additional Resources

- **Perplexity MCP Docs:** https://www.perplexity.ai/help-center/en/articles/11502712-local-and-remote-mcps-for-perplexity
- **brAInwav Server Docs:** [README.md](./README.md)
- **MCP Protocol Spec:** https://modelcontextprotocol.io/introduction
- **FastMCP Documentation:** https://github.com/jlowin/fastmcp

---

## ✅ Quick Start Checklist

- [ ] Copy configuration JSON
- [ ] Open Perplexity settings
- [ ] Add new MCP server
- [ ] Paste configuration
- [ ] Name it "brAInwav Cortex Memory"
- [ ] Save configuration
- [ ] Test with a simple query
- [ ] Verify tools are accessible

---

**Status:** Configuration ready for Perplexity. Use the Local MCP (STDIO) option for best compatibility.

**Maintained by: brAInwav Development Team**  
**Co-authored-by: brAInwav Development Team**
