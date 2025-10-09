# API Reference

Import the orchestrator to build custom workflows.

```ts
import { createExecutionContext, executeNeuron } from "@cortex-os/prp-runner";

const ctx = await createExecutionContext();
const result = await executeNeuron(ctx, "example-neuron", { input: "hello" });
```

For advanced usage, explore exports like `orchestrator`, `neurons`, and `validation`.
