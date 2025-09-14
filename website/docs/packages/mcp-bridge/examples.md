---
title: Examples
sidebar_label: Examples
---

# Examples & Tutorials

## Simple Echo
```bash
echo '{"msg":"ping"}' | mcp-bridge --outbound-url https://httpbin.org/post
```

## Python SDK Usage
```python
import asyncio
from mcp_bridge.bridge import MCPBridge

async def main():
    bridge &#61; MCPBridge(outbound_url&#61;"https://httpbin.org/post")
    await bridge.enqueue_stdio('{"msg":"hi"}')
    await bridge.forward_loop()

asyncio.run(main())
```
