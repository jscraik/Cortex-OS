# ChatGPT MCP Connector Setup Guide

**Date:** October 8, 2025  
**Status:** ✅ Ready for Connection  
**Server:** brAInwav Cortex Memory MCP Server

---

## ✅ Server Status

Your MCP server is **operational and accessible** via Cloudflare Tunnel:

- **Health Check:** ✅ `https://cortex-mcp.brainwav.io/health`
- **SSE Endpoint:** ✅ `https://cortex-mcp.brainwav.io/sse`
- **MCP Endpoint:** ✅ `https://cortex-mcp.brainwav.io/mcp`

---

## 🔌 ChatGPT Desktop Configuration

### Step 1: Access ChatGPT Settings

1. Open **ChatGPT Desktop**
2. Navigate to **Settings** (⚙️)
3. Go to **Connectors** tab
4. Click **"+ Add Connector"** or **"Import MCP Server"**

### Step 2: Enter Server Details

**Important:** ChatGPT connects to MCP servers via the `/mcp` endpoint.

#### Configuration Values:

```
Server URL: https://cortex-mcp.brainwav.io/mcp
Server Name: brAInwav Cortex Memory
Description: brAInwav unified memory hub with local and Pieces LTM integration
```

**Note:** FastMCP v3.19.1 serves the MCP protocol at `/mcp`. The `/sse` endpoint mentioned in some documentation may be for newer versions or different implementations.

### Step 3: Available Tools

Once connected, ChatGPT will discover these tools:

#### Local Memory Tools (memory-core)
1. **memory.store** - Store memories with metadata and embeddings
2. **memory.search** - Semantic and keyword search across memories
3. **memory.analysis** - Analyze memory patterns and trends
4. **memory.relationships** - Discover connections between memories
5. **memory.stats** - Retrieve memory statistics and health metrics
6. **memory.hybrid_search** - Query both local and remote memory sources

#### ChatGPT-Compatible Tools
7. **search** - Deep research and content discovery (ChatGPT MCP spec)
8. **fetch** - Detailed content retrieval by ID (ChatGPT MCP spec)

#### Remote Pieces Tools (if Pieces is running)
9. **pieces.ask_pieces_ltm** - Query Pieces Long-Term Memory engine
10. **pieces.create_pieces_memory** - Store memories in Pieces LTM
11. **pieces.*** - All Pieces tools auto-discovered at runtime

---

## 🧪 Testing the Connection

### Test 1: Health Check

Verify the server is operational:

```bash
curl https://cortex-mcp.brainwav.io/health
```

Expected output:
```
brAInwav Cortex Memory Server - Operational
```

### Test 2: SSE Connection

Test the SSE endpoint (this will hang, which is expected):

```bash
curl -N https://cortex-mcp.brainwav.io/sse \
  -H "Accept: text/event-stream" \
  -H "Cache-Control: no-cache"
```

Press Ctrl+C to stop. If it connects without errors, the endpoint is working.

### Test 3: Use in ChatGPT

After adding the connector:

1. Start a new chat in ChatGPT
2. Enable **"Use Connectors"** or **"Deep Research"** mode
3. Ask a question that requires memory search:
   ```
   Search my memories for information about brAInwav development
   ```
4. ChatGPT should call the `search` or `memory.search` tool

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to server"

**Cause:** Network or SSL issues with Cloudflare tunnel

**Solution:**
1. Check if cloudflared is running:
   ```bash
   ps aux | grep cloudflared
   ```
2. Verify the tunnel status:
   ```bash
   curl https://cortex-mcp.brainwav.io/health
   ```
3. Check tunnel logs:
   ```bash
   tail -f /Users/jamiecraik/.cloudflared/*.log
   ```

### Issue: "No tools discovered"

**Cause:** MCP server not responding to `tools/list` request

**Solution:**
1. Check if the MCP server is running on port 3024:
   ```bash
   lsof -i :3024
   ```
2. Restart the MCP server:
   ```bash
   launchctl stop com.cortexos.mcp.server
   launchctl start com.cortexos.mcp.server
   ```

### Issue: "Session error" or "No valid session ID"

**Cause:** Server configuration has `stateless: false` but ChatGPT may not support sessions

**Solution:** This is expected for the `/mcp` endpoint. Always use `/sse` for ChatGPT.

---

## 🔒 Authentication (Optional)

If you want to add API key authentication:

1. Set the `MCP_API_KEY` environment variable:
   ```bash
   export MCP_API_KEY="your-secure-api-key-here"
   ```

2. Update the LaunchAgent plist:
   ```xml
   <key>EnvironmentVariables</key>
   <dict>
       <key>MCP_API_KEY</key>
       <string>your-secure-api-key-here</string>
   </dict>
   ```

3. Restart the server

4. In ChatGPT, you may need to provide the API key in the connector settings (if supported)

---

## 📊 Monitoring

### Server Logs

Monitor the MCP server logs:

```bash
tail -f ~/Library/Logs/cortex-mcp-server.log
```

### Connection Metrics

Check Cloudflare tunnel traffic:
1. Visit [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **Zero Trust** → **Access** → **Tunnels**
3. View metrics for `cortex-mcp` tunnel

---

## 🎯 Expected Behavior

When working correctly:

1. **ChatGPT starts a conversation** → Establishes SSE connection to `/sse`
2. **User asks a question** → ChatGPT calls `search` tool with query
3. **Server returns results** → List of memory IDs, titles, and URLs
4. **ChatGPT needs details** → Calls `fetch` tool with specific ID
5. **Server returns content** → Full memory content for citation
6. **ChatGPT formulates answer** → Uses retrieved context in response

---

## 📚 Additional Resources

- **MCP Protocol Spec:** https://modelcontextprotocol.io/introduction
- **ChatGPT MCP Docs:** https://platform.openai.com/docs/guides/chatgpt-mcp
- **FastMCP Documentation:** https://github.com/jlowin/fastmcp
- **brAInwav Server Docs:** [README.md](./README.md)

---

## 🚀 Quick Start Summary

1. ✅ Server is already running (port 3024)
2. ✅ Cloudflare tunnel is active (`cortex-mcp.brainwav.io`)
3. ✅ SSE endpoint is available (`/sse`)
4. 📝 **Action Required:** Add connector in ChatGPT with URL: `https://cortex-mcp.brainwav.io/sse`

---

**Status:** Your server is ready for ChatGPT connection. The issue was configuration-related, not server-related.

**Next Step:** In ChatGPT Desktop settings, add the connector using the URL above.

---

**Maintained by: brAInwav Development Team**  
**Co-authored-by: brAInwav Development Team**
