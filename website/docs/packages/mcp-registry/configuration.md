---
title: Configuration
sidebar_label: Configuration
---

# Configuration

## Registry file location

By default the registry is stored at:

```
~/.config/cortex-os/mcp/servers.json
```

Override the path with environment variables:

| Variable | Purpose |
| --- | --- |
| `CORTEX_HOME` | Base directory for Cortex OS configuration. |
| `XDG_CONFIG_HOME` | Standard XDG config directory; used when `CORTEX_HOME` is not set. |

## File format

The registry is a JSON document:

```json
{
  "servers": [
    { "id": "demo", "name": "Demo", "transports": {"stdio": {}} }
  ]
}

```