# Architecture

```text
stdin → [MCPBridge] → HTTP POST
                     ↘
                      SSE → stdout
```

- **MCPBridge** – core class handling rate limiting, queueing and HTTP/SSE transport.
- **RateConfig** – dataclass defining throughput limits and queue depth.
- **CLI** – thin wrapper around `MCPBridge` for command‑line use.

The bridge uses `httpx.AsyncClient` for networking and asyncio queues for buffering.
