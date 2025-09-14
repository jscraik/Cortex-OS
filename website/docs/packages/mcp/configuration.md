---
title: Configuration
sidebar_label: Configuration
---

# Configuration

Configuration files live in `~/.mcp` by default. The CLI creates this directory on first run.

## `config.json`
Defines server and plugin settings.

```json
{
  "db_url": "postgresql+asyncpg://user:pass@localhost:5432/mcp",
  "redis_url": "redis://localhost:6379/0",
  "plugin_dir": "plugins"
}
```

## Environment Variables
| Variable | Description |
| --- | --- |
| `MCP_DB_URL` | Override database connection |
| `MCP_REDIS_URL` | Redis endpoint |
| `MCP_PLUGIN_DIR` | Custom plugin directory |

Set variables before launching the server.
