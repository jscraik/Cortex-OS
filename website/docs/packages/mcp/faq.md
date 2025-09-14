---
title: Faq
sidebar_label: Faq
---

# FAQ

### Why does the server fail to start?
Ensure database and Redis URLs are reachable and credentials are correct.

### How do I add a plugin?
Place the plugin package in the directory referenced by `MCP_PLUGIN_DIR` and restart the server.

### Can I run without Redis?
Set `enable_celery&#61;false` in configuration to disable the task queue.
