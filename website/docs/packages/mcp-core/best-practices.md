---
title: Best Practices
sidebar_label: Best Practices
---

# Best Practices

- Validate `ServerInfo` at startup to fail fast.
- Prefer HTTPS endpoints and short-lived tokens.
- Reuse a single client instance per server to amortize connection cost.
- When using stdio, ensure the child process flushes output with newline.
