---
title: User Guide
sidebar_label: User Guide
---

# User Guide

## List servers

```ts
import { readAll } from '@cortex-os/mcp-registry';
const servers = await readAll();
```

## Register a server

```ts
import { upsert } from '@cortex-os/mcp-registry';
await upsert({
  name: 'demo',
  url: 'http://localhost:3000',
  transports: { stdio: {} }
});
```

## Remove a server

```ts
import { remove } from '@cortex-os/mcp-registry';
await remove('demo');

```