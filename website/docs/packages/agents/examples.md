---
title: Examples
sidebar_label: Examples
---

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