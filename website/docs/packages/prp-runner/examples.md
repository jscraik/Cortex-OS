---
title: Examples
sidebar_label: Examples
---

# Examples & Tutorials

## Simple Execution

```ts
import { executeNeuron, createExecutionContext } from "@cortex-os/prp-runner";

const ctx = await createExecutionContext();
const output = await executeNeuron(ctx, "echo", { text: "hello" });
console.log(output);
```

For more tutorials, see the demo scripts in the `scripts/` directory.
