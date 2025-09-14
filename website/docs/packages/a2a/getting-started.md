---
title: Getting Started
sidebar_label: Getting Started
---

# Getting Started

## Prerequisites

- Node.js 18+
- pnpm, npm, or yarn

## Installation

```bash
pnpm add @cortex-os/a2a
```

## First Launch

```typescript
import { createBus } from '@cortex-os/a2a/bus';
import { inproc } from '@cortex-os/a2a/inproc';
import { createEnvelope } from '@cortex-os/a2a-core/envelope';

const bus = createBus(inproc());
await bus.publish(createEnvelope({ type: 'demo.event', data: {} }));

```