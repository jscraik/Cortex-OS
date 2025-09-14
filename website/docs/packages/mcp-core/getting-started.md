---
title: Getting Started
sidebar_label: Getting Started
---

# Getting Started

## Prerequisites

- Node.js ≥ 20
- pnpm

## Installation

```sh
pnpm add @cortex-os/mcp-core
```

## First Tool Call

```ts
import { createEnhancedClient } from "@cortex-os/mcp-core";

const client = await createEnhancedClient({
  name: "example",
  transport: "streamableHttp",
  endpoint: "http://localhost:3000/tool"
});

const result = await client.callTool({ name: "ping" });
await client.close();

```