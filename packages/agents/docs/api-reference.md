# API Reference

### Interfaces

#### `Agent`
```ts
interface Agent {
  id: string;
  name: string;
  capabilities: string[];
  execute(task: Task): Promise<AgentResult>;
}
```

#### `Executor`
```ts
interface Executor {
  executeTask(task: Task, agent: Agent): Promise<AgentResult>;
  getCapabilities(): string[];
  isHealthy(): boolean;
}
```

These interfaces are exported from `@cortex-os/agents` and form the basis of custom agent implementations.
