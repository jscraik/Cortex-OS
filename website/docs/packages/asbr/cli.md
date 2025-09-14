---
title: Cli
sidebar_label: Cli
---

# CLI Reference

`cortex-asbr` boots the runtime.

```bash
npx cortex-asbr
```

### Options
Environment variables configure the instance:

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `ASBR_PORT` | HTTP port | `7439` |
| `ASBR_HOST` | Bind address | `127.0.0.1` |

The CLI prints the listening URL and an authentication token.
