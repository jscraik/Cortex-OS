# User Guide

1. Create a kernel with `createKernel`.
2. Register nodes such as `runBuildNode` or custom nodes.
3. Execute `kernel.run()` to process the graph.
4. Inspect history with `getExecutionHistory()`.

### Code Example

```js
import { createKernel, runBuildNode } from 'your-kernel-package';

// 1. Create a kernel
const kernel = createKernel();

// 2. Register nodes
kernel.registerNode(runBuildNode);
// kernel.registerNode(customNode);

// 3. Execute the kernel
await kernel.run();

// 4. Inspect execution history
const history = kernel.getExecutionHistory();
console.log(history);
