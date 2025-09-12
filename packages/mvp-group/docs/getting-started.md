# Getting Started

## Installation
```bash
pnpm add @cortex-os/mvp-group
```

## First Workflow
```ts
import { runPRPWorkflow } from '@cortex-os/mvp-group';
import { createOrchestrator } from '@cortex-os/mvp-core';

const orchestrator = createOrchestrator();
const blueprint = {
  title: 'Hello MVP',
  description: 'Demo build',
  requirements: ['example']
};

await runPRPWorkflow(orchestrator, blueprint);
```
