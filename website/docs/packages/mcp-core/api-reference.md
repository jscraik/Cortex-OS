---
title: Api Reference
sidebar_label: Api Reference
---

# API Reference

## `createEnhancedClient(options: ServerInfo): Promise&lt;EnhancedClient&gt;`

Creates an `EnhancedClient` using the supplied `ServerInfo`.

### ServerInfo

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | yes | logical server name |
| `transport` | ``'stdio' ` ` \|``'sse' `\` | `'streamableHttp'` | yes | communication method |
| `command` | string | conditional | binary to spawn when `transport` is `stdio` |
| `args` | string[] | no | arguments for stdio |
| `env` | Record&lt;string,string&gt; | no | env vars for stdio |
| `endpoint` | string | conditional | required for HTTP transports |
| `headers` | Record&lt;string,string&gt; | no | HTTP headers |

### EnhancedClient

- `callTool({name, arguments?})` - performs a tool invocation and resolves with JSON result.
- `close()` - cleans up underlying transport.
