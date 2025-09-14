---
title: Architecture
sidebar_label: Architecture
---

# Architecture

```text
┌───────────────┐
│  ServerInfo   │
└──────┬────────┘
       │
       ▼
┌───────────────┐
│EnhancedClient │
└──────┬────────┘
       │
  ┌────┴─────┐
  │ Transports│
  └──────────┘
```

Components:

- **ServerInfoSchema**: validates configuration at runtime.
- **EnhancedClient**: wraps transport logic and tool invocation.
- **Transports**: HTTP uses `fetch`; stdio spawns a child process.
