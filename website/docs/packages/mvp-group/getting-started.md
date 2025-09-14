---
title: Getting Started
sidebar_label: Getting Started
---

# Getting Started

## Installation
```bash
pnpm add @cortex-os/mvp-group
```

## First Workflow
```ts
import { runPRPWorkflow, createOrchestrator } from '@cortex-os/mvp-group';
const orchestrator = createOrchestrator();
const blueprint = {
  title: 'Hello MVP',
  description: 'Demo build',
  requirements: ['example']
};

await runPRPWorkflow(orchestrator, blueprint);

```