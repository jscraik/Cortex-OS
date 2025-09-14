---
title: Configuration
sidebar_label: Configuration
---

# Configuration

`createEnhancedClient` consumes a `ServerInfo` object. Fields map to environment configuration:

| Field | Description |
| --- | --- |
| `name` | logical identifier |
| `transport` | `stdio`, `sse`, or `streamableHttp` |
| `command` | executable for stdio transport |
| `args` | CLI arguments |
| `env` | env vars passed to child process |
| `endpoint` | HTTP URL for tool calls |
| `headers` | extra HTTP headers such as auth tokens |

## Config Files

Example `.env`:

```env
MCP_ENDPOINT=http://localhost:3000/tool
MCP_TOKEN=secret
```

Using in code:

```ts
const server &#61; {
  name: "local",
  transport: "streamableHttp",
  endpoint: process.env.MCP_ENDPOINT,
  headers: { Authorization: `Bearer ${process.env.MCP_TOKEN}` }
};

```