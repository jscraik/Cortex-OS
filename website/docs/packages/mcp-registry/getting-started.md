---
title: Getting Started
sidebar_label: Getting Started
---

# Getting Started

## Prerequisites

- Node.js 20+
- pnpm package manager

## Installation

```bash
pnpm add @cortex-os/mcp-registry
```

## First use

```ts
import { upsert } from '@cortex-os/mcp-registry';
import type { ServerInfo } from '@cortex-os/mcp-core';

const server: ServerInfo = {
  name: 'demo',
  url: 'http://localhost:3000',
  transports: { stdio: {} }
};

await upsert(server);
```

The server manifest is stored in `~/.config/cortex-os/mcp/servers.json`.
