---
title: Api Reference
sidebar_label: Api Reference
---

# API Reference

### Interfaces

#### `Agent`
```ts
interface Agent {
  id: string;
  name: string;
  capabilities: string[];
  execute(task: Task): Promise&lt;AgentResult&gt;;
}
```

#### `Executor`
```ts
interface Executor {
  executeTask(task: Task, agent: Agent): Promise&lt;AgentResult&gt;;
  getCapabilities(): string[];
  isHealthy(): boolean;
}
```

These interfaces are exported from `@cortex-os/agents` and form the basis of custom agent implementations.
