---
title: Providers Setup
sidebar_label: Providers Setup
---

# Providers Setup

The library integrates with external MCP servers.

## Environment Variables

- `MCP_ENDPOINT` - base URL for HTTP transports.
- `MCP_TOKEN` - bearer token for `Authorization` header.
- `MCP_COMMAND` - path to executable for stdio.

Mapping to `ServerInfo`:

```ts
const server &#61; {
  name: "remote",
  transport: "streamableHttp",
  endpoint: process.env.MCP_ENDPOINT,
  headers: { Authorization: `Bearer ${process.env.MCP_TOKEN}` }
};
```
