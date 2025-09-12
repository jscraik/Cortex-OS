# Getting Started

## Prerequisites
- Node.js 20+
- pnpm

## Installation
```bash
pnpm add @cortex-os/contracts-v2
```

## First Use
```ts
import { MessageEnvelopeSchema } from "@cortex-os/contracts-v2";

const msg = MessageEnvelopeSchema.parse({
  id: "1",
  kind: "MCP",
  ts: new Date().toISOString(),
  payload: {},
  meta: { seed: 1 }
});
```
