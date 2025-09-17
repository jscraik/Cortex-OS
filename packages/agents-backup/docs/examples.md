# Examples & Tutorials

```typescript
import { Agent } from '@cortex-os/agents';

const echo: Agent = {
  id: 'echo',
  name: 'Echo Agent',
  capabilities: ['echo'],
  async execute(task) {
    return { success: true, result: task.input };
  },
};
```
