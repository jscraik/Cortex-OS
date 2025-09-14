---
title: Configuration
sidebar_label: Configuration
---

# Configuration

Settings are loaded from `mvp-server.config.json` and overridden by environment variables.

```json
{
  "port": 3000,
  "plugins": ["./plugins/health"]
}
```

### Environment Variables
| Variable | Description | Default |
| ---------- | ------------- | --------- |
| `MVP_SERVER_PORT` | Port to bind | `3000` |
| `MVP_SERVER_LOG_LEVEL` | Pino log level | `info` |
