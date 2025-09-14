---
title: Examples
sidebar_label: Examples
---

# Examples & Tutorials

```ts
import { runPRPWorkflow, createOrchestrator } from '@cortex-os/mvp-group';
const orchestrator = createOrchestrator();
const blueprint = {
  title: 'Feature Test',
  description: 'Runs evaluation phase only',
  requirements: []
};

const state = await runPRPWorkflow(orchestrator, blueprint, { deterministic: true });
console.log(state.cerebrum?.decision);

```