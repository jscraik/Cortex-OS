---
title: Deployment
sidebar_label: Deployment
---

# Deployment

## Local Process
Install via pip and run as a background service:
```bash
pip install cortex-mcp-bridge
nohup mcp-bridge --outbound-url https://example.com/ingest &
```

## Container
```bash
docker run -e MCP_BRIDGE_OUTBOUND_URL=https://example.com/ingest cortex/mcp-bridge:latest

```