---
title: User Guide
sidebar_label: User Guide
---

# User Guide

## Creating a Task
1. Start the runtime: `npx cortex-asbr`
2. Use the SDK or API to submit work:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"demo","input":{}}' \
        http://127.0.0.1:7439/v1/tasks
```

## Retrieving Artifacts
`GET /v1/artifacts/{id}` downloads generated files.

## Keyboard Shortcuts
When building UIs with the accessibility helpers:
- `Tab`/`Shift+Tab` for focus navigation
- `Alt+1` announces the current region

```