# Perplexity "Connected but No Tools" - Troubleshooting Guide

**Issue:** Perplexity shows "Connected" but no tools appear  
**Root Cause:** Node.js native module version mismatch  
**Status:** ✅ FIXED

---

## Problem Diagnosis

### Symptoms
- Perplexity MCP connection shows "Connected" ✅
- But tool list is empty ❌
- Server logs show tools being registered
- STDIO server crashes silently on startup

### Root Cause
```
better-sqlite3 compiled for: Node.js v22.12.0 (MODULE_VERSION 137)
Perplexity using:           Node.js v22.19.0 (MODULE_VERSION 127)
Result:                     ERR_DLOPEN_FAILED on startup
```

The memory provider requires better-sqlite3, which is a native Node module. When compiled for a different Node version, it fails to load.

---

## Solution Applied

### 1. Rebuild Native Modules
```bash
cd /Users/jamiecraik/.Cortex-OS
pnpm rebuild better-sqlite3
```

### 2. Verify Fix
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | \
/Users/jamiecraik/.Cortex-OS/packages/mcp-server/scripts/start-stdio.sh
```

Should return:
```json
{
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {"tools": {}, "logging": {}},
    "serverInfo": {"name": "brainwav-cortex-memory", "version": "3.0.0"}
  }
}
```

### 3. Restart Perplexity
- Completely quit Perplexity
- Restart the app
- MCP server will reconnect
- All 17 tools should now appear

---

## Why This Happened

1. **Multiple Node Versions**
   - System has multiple Node.js versions
   - better-sqlite3 built with one version
   - Perplexity uses different version

2. **Native Module Compilation**
   - better-sqlite3 is a C++ addon
   - Must be compiled for exact Node version
   - NODE_MODULE_VERSION must match

3. **Silent Failure**
   - STDIO mode doesn't show stderr to Perplexity
   - Server crashes but socket stays open
   - Perplexity sees "Connected" but gets no tools response

---

## Prevention

### Use useBuiltInNode
In Perplexity config:
```json
{
  "useBuiltInNode": true
}
```

This ensures Perplexity uses its own Node.js runtime, avoiding version mismatches.

### Rebuild After Node Updates
Whenever Node.js is updated, rebuild native modules:
```bash
cd /Users/jamiecraik/.Cortex-OS
pnpm rebuild
```

---

## Verification Checklist

✅ better-sqlite3 rebuilt successfully  
✅ STDIO initialize test returns valid response  
✅ Server logs show all tools registered  
✅ Perplexity restarted completely  
✅ Configuration uses useBuiltInNode: true  

---

## Expected Tools (17 Total)

After fix, Perplexity should show:

**Memory Tools (6):**
- memory.store
- memory.search  
- memory.analysis
- memory.relationships
- memory.stats
- memory.hybrid_search

**Code Operations (5):**
- agent_toolkit_search
- agent_toolkit_multi_search
- agent_toolkit_codemod
- agent_toolkit_validate
- agent_toolkit_codemap

**Pieces Integration (2):**
- pieces.ask_pieces_ltm
- pieces.create_pieces_memory

**Search/Fetch (2):**
- search
- fetch

**Utility (2):**
- Auto-discovered tools

---

## If Tools Still Don't Appear

### 1. Check Server Logs
```bash
tail -f ~/Library/Logs/com.cortexos.mcp.server.out.log
```

Look for:
- "Successfully registered agent-toolkit tools"
- "Successfully registered remote Pieces tools"
- Any error messages

### 2. Remove and Re-add in Perplexity
- Open Perplexity Settings
- Remove "brAInwav Cortex Memory" connector
- Add it again with updated config
- Restart Perplexity

### 3. Test STDIO Manually
```bash
/Users/jamiecraik/.Cortex-OS/packages/mcp-server/scripts/start-stdio.sh
```

Type JSON-RPC messages to test:
```json
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
```

Should return list of 17+ tools.

### 4. Check for Stale Processes
```bash
ps aux | grep "mcp-server/dist/index.js"
```

Kill any stale processes:
```bash
pkill -f "mcp-server/dist/index.js"
launchctl kickstart -k gui/$(id -u)/com.cortexos.mcp.server
```

---

## Related Issues

### Issue: useBuiltInNode not working
**Solution:** Update Perplexity to latest version

### Issue: Pieces tools missing
**Solution:** Set `PIECES_MCP_ENABLED=true` in config

### Issue: Agent-toolkit tools missing  
**Solution:** Set `AGENT_TOOLKIT_ENABLED=true` in config

---

## Success Indicators

When working correctly:
1. Perplexity shows "Connected" ✅
2. All 17 tools listed ✅
3. Can execute: "Search the codebase for X" ✅
4. Memory operations work ✅
5. No errors in server logs ✅

---

**Issue Resolved:** October 8, 2025  
**Maintained by: brAInwav Development Team**
