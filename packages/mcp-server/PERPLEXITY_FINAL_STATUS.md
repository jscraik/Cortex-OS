# Perplexity MCP Connection - Final Status

**Date:** October 9, 2025  
**Status:** ✅ WORKING (Memory Tools Only)  
**Issue:** Perplexity STDIO MCP client has handshake limitations with FastMCP v3

---

## 🎯 Working Configuration

**Script:** `start-perplexity.sh`  
**Tools Available:** 8 core memory tools  
**Status:** ✅ Fully Operational

### Configuration JSON
```json
{
  "command": "/Users/jamiecraik/.Cortex-OS/packages/mcp-server/scripts/start-perplexity.sh",
  "args": []
}
```

### Available Tools (8)
1. **memory.store** - Store memories with metadata and embeddings
2. **memory.search** - Semantic and keyword search across memories
3. **memory.analysis** - Analyze memory patterns and trends
4. **memory.relationships** - Discover connections between memories
5. **memory.stats** - Retrieve memory statistics and health metrics
6. **memory.hybrid_search** - Query both local and remote memory sources
7. **search** - Deep research and content discovery (Perplexity-compatible)
8. **fetch** - Detailed content retrieval by ID (Perplexity-compatible)

---

## ⚠️ Known Limitations

### Agent-Toolkit Tools
**Status:** ❌ Not Compatible with Perplexity STDIO

**Issue:** Adding agent-toolkit tools (search, codemod, validate, codemap) during server startup causes Perplexity's MCP client to fail the initialization handshake, resulting in **0 tools available**.

**Root Cause:** Perplexity's STDIO MCP implementation doesn't properly handle the capability negotiation when additional tools are registered during async initialization. The warning `[FastMCP warning] could not infer client capabilities after 10 attempts` indicates Perplexity isn't sending proper MCP initialization messages.

**Workaround:** Use the working configuration with 8 memory tools only.

### Experimental Configuration (Not Recommended)
If you want to try enabling agent-toolkit (may result in 0 tools):

```json
{
  "command": "/Users/jamiecraik/.Cortex-OS/packages/mcp-server/scripts/start-perplexity-with-toolkit.sh",
  "args": []
}
```

This enables:
- ✅ 8 memory tools
- ⚠️ 5 agent-toolkit tools (search, multi-search, codemod, validate, codemap)
- **Risk:** May break Perplexity handshake and show 0 tools

---

## 🔧 Technical Details

### What Was Fixed
1. ✅ **better-sqlite3 native module** - Rebuilt for Node.js v22.19.0
2. ✅ **Script permissions** - Made executable with correct shebang
3. ✅ **Node.js path** - Uses absolute path (Perplexity doesn't support `useBuiltInNode`)
4. ✅ **Environment variables** - Hardcoded in script (Perplexity doesn't pass env vars properly)
5. ✅ **Tool registration timing** - Moved to async main() before server.start()

### What Still Doesn't Work
- ❌ Agent-toolkit tools break Perplexity's STDIO handshake
- ❌ Pieces MCP proxy (disabled to avoid conflicts)
- ❌ Environment variable passing from Perplexity config

### FastMCP v3 Compatibility Issue
The server shows this warning during startup:
```
[FastMCP warning] could not infer client capabilities after 10 attempts. Connection may be unstable.
```

This indicates **Perplexity's MCP STDIO client doesn't fully implement the MCP 2024-11-05 protocol** that FastMCP v3 expects. However, with minimal tool registration (8 memory tools), the connection succeeds.

---

## 📊 Comparison: Claude vs Perplexity

| Feature | Claude Desktop | Perplexity |
|---------|---------------|------------|
| Memory Tools (8) | ✅ Works | ✅ Works |
| Agent-Toolkit Tools (5) | ✅ Works | ❌ Breaks handshake |
| Pieces Proxy Tools (2) | ✅ Works | ❌ Not tested |
| Total Tools | 15 | 8 |
| `useBuiltInNode` | ✅ Supported | ❌ Not supported |
| Env var passing | ✅ Works | ❌ Doesn't work |
| MCP Protocol | Full support | Partial support |

---

## 🚀 Recommended Usage

**For Perplexity Users:**
1. Use the standard `start-perplexity.sh` script
2. Accept 8 memory tools as the working set
3. Use Claude Desktop for agent-toolkit features
4. Monitor Perplexity MCP updates for improved STDIO support

**For Development:**
- Memory operations: ✅ Use Perplexity
- Code operations (search, codemod): ❌ Use Claude Desktop instead
- Hybrid workflows: Use both clients for their strengths

---

## 📝 Files Created

1. **start-perplexity.sh** - Production configuration (8 tools)
2. **start-perplexity-minimal.sh** - Same as above, explicitly minimal
3. **start-perplexity-with-toolkit.sh** - Experimental (may not work)

---

## 🎓 Lessons Learned

1. **Perplexity's MCP STDIO implementation is limited** compared to Claude Desktop
2. **FastMCP v3's capability negotiation** times out with Perplexity after 10 attempts
3. **Tool registration timing matters** - but even proper timing doesn't fix Perplexity's handshake
4. **Environment variables don't pass through** from Perplexity's JSON config
5. **Hardcoded script values** are more reliable than env var defaults

---

## ✅ Success Criteria Met

- ✅ Server starts without errors
- ✅ 8 memory tools available in Perplexity
- ✅ Tools can be invoked successfully
- ✅ No better-sqlite3 version mismatch errors
- ✅ Absolute Node.js path works without `useBuiltInNode`
- ✅ Documentation updated

---

**Maintained by: brAInwav Development Team**  
**Co-authored-by: brAInwav Development Team**
