---
title: Architecture
sidebar_label: Architecture
---

# Architecture

```mermaid
graph TD
  A[SecureDatabaseWrapper] --&gt;|validates| B[Database Driver]
  C[SecureCommandExecutor] --&gt;|spawns| D[Child Process]
  E[Validation Utils] --&gt; A
  E --&gt; C
```

Modules:
- `SecureDatabaseWrapper` - wraps DB clients.
- `SecureCommandExecutor` - mediates shell access.
- `validation` - shared sanitisation helpers.

```