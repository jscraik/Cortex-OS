---
title: Api Reference
sidebar_label: Api Reference
---

# API Reference

Import the orchestrator to build custom workflows.

```ts
import { createExecutionContext, executeNeuron } from "@cortex-os/prp-runner";

const ctx = await createExecutionContext();
const result = await executeNeuron(ctx, "example-sub-agent", { input: "hello" });
```

For advanced usage, explore exports like `orchestrator`, `sub-agents`, and `validation`.
