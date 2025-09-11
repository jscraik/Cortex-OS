# cortex-mcp-bridge

Stdio ↔ HTTP/SSE bridge for MCP transports, with basic backpressure controls.

- Receives stdio JSON lines, forwards as HTTP POST or SSE stream.
- Accepts HTTP/SSE events and emits to stdio.
- Optional rate limit and queue bounds for flow control.

This is an initial scaffold. Tests describe the expected behavior.
