# Examples & Tutorials

```ts
import { runPRPWorkflow } from '@cortex-os/mvp-group';
import { createOrchestrator } from '@cortex-os/mvp-core';

const orchestrator = createOrchestrator();
const blueprint = {
  title: 'Feature Test',
  description: 'Runs evaluation phase only',
  requirements: []
};

const state = await runPRPWorkflow(orchestrator, blueprint, { deterministic: true });
console.log(state.cerebrum?.decision);
```
