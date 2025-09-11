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
import { createBus } from '@cortex-os/a2a-core/bus';
import { inproc } from '@cortex-os/a2a-transport/inproc';

const bus = createBus(inproc());
await bus.publish({ type: 'demo.event', data: {} });
```

