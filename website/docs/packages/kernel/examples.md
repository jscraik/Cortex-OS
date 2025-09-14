---
title: Examples
sidebar_label: Examples
---

# Examples & Tutorials

### Minimal Execution

```ts
import { createKernel, runBuildNode } from '@cortex-os/kernel';

const kernel = createKernel();
kernel.addNode(runBuildNode);
await kernel.run();
```

See [../examples](../examples) for more.
