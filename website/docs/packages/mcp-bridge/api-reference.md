---
title: Api Reference
sidebar_label: Api Reference
---

# API Reference

```python
from mcp_bridge.bridge import MCPBridge, RateConfig

rate &#61; RateConfig(messages_per_sec&#61;5, max_queue&#61;50)
bridge &#61; MCPBridge(outbound_url&#61;"https://example.com/ingest", rate&#61;rate)
```

## MCPBridge
- `enqueue_stdio(line: str)` - queue a JSON line for forwarding.
- `forward_loop()` - coroutine that posts queued messages.
- `read_stdio(reader)` - consume an async iterator and enqueue each line.
- `subscribe_sse(url, on_event)` - connect to an SSE stream and invoke a callback per event.

## RateConfig
- `messages_per_sec` - throughput cap.
- `max_queue` - pending message capacity.

All networking uses `httpx.AsyncClient`; authentication headers may be supplied via custom client wrappers.
