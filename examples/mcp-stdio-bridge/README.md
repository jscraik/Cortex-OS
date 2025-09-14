# MCP stdio ↔ HTTP Bridge Example

Demonstrates launching an `@cortex-os/mcp-bridge` instance as a child process
(stdio JSONL) and interacting with it via `@cortex-os/mcp-core` client.

Flow:
client (stdio JSON lines) -> bridge (forwards as HTTP POST) -> mock HTTP server -> response back to client.

## Run

```bash
node examples/mcp-stdio-bridge/server.mjs &
SERVER_PID=$!
node examples/mcp-stdio-bridge/bridge.mjs &
BRIDGE_PID=$!
node examples/mcp-stdio-bridge/client.mjs
kill $BRIDGE_PID $SERVER_PID
```

## Files

- `server.mjs` – minimal HTTP JSON-RPC-like echo
- `bridge.mjs` – creates `StdioHttpBridge` and starts reading stdin
- `client.mjs` – spawns bridge as stdio tool server via `createEnhancedClient`
