# Cortex Orchestration

Deterministic workflow engine with pluggable scheduling, sandboxed task execution, and reliability patterns.

## Features
- **Workflow validation** using Zod schemas and structural checks.
- **Priority scheduler** with FIFO fairness.
- **Sandboxed execution** for untrusted tasks.
- **Reliability primitives**: circuit breaker, outbox, dead-letter queue.
- **Observability** via OpenTelemetry metrics and traces.

## Usage
```ts
import { PriorityScheduler } from '@cortex-os/orchestration';

const scheduler = new PriorityScheduler();
scheduler.enqueue({ id: 'a', run: async () => 'hi' });
await scheduler.runAll();
```

## Testing
```bash
pnpm --filter @cortex-os/orchestration test
pnpm --filter @cortex-os/orchestration test:coverage
```
