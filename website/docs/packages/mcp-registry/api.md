---
title: Api
sidebar_label: Api
---

# API Reference

```ts
import { readAll, upsert, remove } from '@cortex-os/mcp-registry';
```

## `readAll(): Promise<ServerInfo[]>`
Returns an array of all registered servers.

## `upsert(info: ServerInfo): Promise<void>`
Adds or replaces a server entry.

## `remove(name: string): Promise<boolean>`
Deletes a server by name. Resolves to `true` if an entry was removed.

Types for `ServerInfo` and related schemas are exported from `@cortex-os/mcp-core`.
