# FastMCP tools/list Bug Report

**Affected Version:** FastMCP 3.18.0
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

Returns error trying to access `clientInfo.vendor` which is not part of the MCP protocol specification. FastMCP 3.19.1 resolves this regression by guarding against missing vendor metadata.

## Impact

- Breaks Perplexity MCP integration
- STDIO mode unusable for tools/list
- HTTP mode works fine

## Workaround

Upgrade to FastMCP 3.19.1 or later. Switching to @modelcontextprotocol/sdk may be necessary only if upgrade is not possible.

---

**Server:** brAInwav Cortex Memory MCP Server  
**Date:** October 8, 2025
