# FastMCP tools/list Bug Report

**Version:** FastMCP 3.18.0 and 3.19.1  
**Transport:** STDIO  
**Error:** `Cannot read properties of undefined (reading 'vendor')`

## Problem

When using FastMCP in STDIO mode, the `tools/list` method crashes with:

```
{"jsonrpc":"2.0","id":2,"error":{"code":-32603,"message":"Cannot read properties of undefined (reading 'vendor')"}}
```

## Reproduction

```javascript
// Send proper initialize
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"perplexity","version":"1.0.0"}}}

// Send initialized notification  
{"jsonrpc":"2.0","method":"initialized","params":{}}

// Request tools/list - THIS CRASHES
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
```

## Expected Behavior

Should return list of registered tools.

## Actual Behavior

Returns error trying to access `clientInfo.vendor` which is not part of the MCP protocol specification.

## Impact

- Breaks Perplexity MCP integration
- STDIO mode unusable for tools/list
- HTTP mode works fine

## Workaround

None found. Switching to @modelcontextprotocol/sdk may be necessary.

---

**Server:** brAInwav Cortex Memory MCP Server  
**Date:** October 8, 2025
