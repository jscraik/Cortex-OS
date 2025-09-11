# @cortex-os/service-orchestration

A robust workflow orchestration engine for Cortex-OS with enterprise-grade features including DAG-based execution, hooks system, compensation framework, and advanced cancellation support.

## Features

### 🚀 Core Orchestration
- **DAG-based Workflows**: Directed acyclic graph execution with topological ordering
- **Conditional Branching**: Dynamic path selection based on runtime predicates
- **Loop/Map Semantics**: Iterate over collections with parallel execution support
- **Retry Policies**: Configurable backoff and retry strategies per step

### 🎣 Hooks System
- **Step-level Hooks**: Pre/post execution hooks for individual steps
- **Global Hooks**: Apply hooks to all steps in a workflow
- **Workflow Lifecycle**: Pre/post workflow execution and error handling
- **Cancellation Hooks**: Cleanup hooks for graceful cancellation

### 🔄 Compensation Framework (Saga Pattern)
- **Automatic Rollback**: Undo completed steps when failures occur
- **LIFO Compensation**: Last-in-first-out compensation order
- **Idempotency**: Safe to retry compensation operations
- **Compensation Hooks**: Observability into rollback operations

### ❌ Advanced Cancellation
- **Timeout Support**: Automatic cancellation after specified duration
- **Cleanup Hooks**: Resource cleanup on cancellation
- **Partial Rollback**: Compensate only executed steps on cancellation
- **AbortSignal Integration**: Standard Web API cancellation patterns

### 👤 Human-in-the-Loop (HITL)
- **Approval Workflows**: Pause execution for human decisions
- **Timeout Support**: Automatic fallback after approval timeout
- **Type Safety**: Strongly typed proposal and decision handling

## Installation

```bash
pnpm add @cortex-os/service-orchestration
```

## Quick Start

```typescript
import { run, HookManager, CompensationManager } from '@cortex-os/service-orchestration';

// Define a simple workflow
const workflow = {
  graph: {
    start: ['process'],
    process: ['end'],
    end: []
  },
  steps: {
    start: async () => console.log('Starting workflow'),
    process: async ({ signal }) => {
      if (signal?.aborted) throw new Error('Cancelled');
      console.log('Processing data');
    },
    end: async () => console.log('Workflow completed')
  }
};

// Execute the workflow
await run(workflow, { workflowId: 'example-001' });
```

## Advanced Examples

### Workflow with Hooks and Compensation

```typescript
import { run, HookManager, CompensationManager } from '@cortex-os/service-orchestration';

const hooks = new HookManager();
const compensation = new CompensationManager();

// Add lifecycle hooks
hooks.addPreWorkflowHook(async (ctx) => {
  console.log(`Starting workflow: ${ctx.workflowId}`);
});

hooks.addPostStepHook('process', async (ctx) => {
  console.log(`Completed step: ${ctx.stepId}`);
});

// Register compensations for rollback
compensation.registerCompensation('process', async (ctx) => {
  console.log(`Rolling back step: ${ctx.stepId}`);
  // Undo the process step
});

const workflow = {
  graph: { start: ['process'], process: ['end'], end: [] },
  steps: {
    start: async () => { /* setup */ },
    process: async () => { 
      // This might fail and trigger compensation
      throw new Error('Process failed');
    },
    end: async () => { /* cleanup */ }
  },
  hooks,
  compensation
};

try {
  await run(workflow, { workflowId: 'compensated-workflow' });
} catch (error) {
  // Compensation will have run automatically
  console.log('Workflow failed, compensation completed');
}
```

### Conditional Branching

```typescript
const workflow = {
  graph: {
    start: ['decision'],
    decision: ['pathA', 'pathB'],
    pathA: ['end'],
    pathB: ['end'],
    end: []
  },
  steps: {
    start: async () => { /* initialization */ },
    decision: async () => { /* evaluation logic */ },
    pathA: async () => console.log('Took path A'),
    pathB: async () => console.log('Took path B'),
    end: async () => console.log('Workflow completed')
  },
  branches: {
    decision: {
      predicate: async () => Math.random() > 0.5,
      trueTargets: ['pathA'],
      falseTargets: ['pathB']
    }
  }
};

await run(workflow);
```

### Loop/Map Operations

```typescript
const workflow = {
  graph: {
    start: ['processItems'],
    processItems: ['end'],
    end: []
  },
  steps: {
    start: async () => console.log('Starting batch processing'),
    end: async () => console.log('Batch processing completed')
  },
  loops: {
    processItems: {
      items: async () => ['item1', 'item2', 'item3'],
      body: async (item) => {
        console.log(`Processing ${item}`);
        // Process each item
      }
    }
  }
};

await run(workflow);
```

### Cancellation with Timeout

```typescript
import { run, CancellationController } from '@cortex-os/service-orchestration';

const cancellation = new CancellationController();

const workflow = {
  graph: { start: ['longTask'], longTask: ['end'], end: [] },
  steps: {
    start: async () => console.log('Starting long task'),
    longTask: async ({ signal }) => {
      // Simulate long-running operation
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 10000);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Task cancelled'));
        });
      });
    },
    end: async () => console.log('Task completed')
  }
};

try {
  await run(workflow, {
    signal: cancellation.signal,
    cancellation: { 
      reason: 'User requested cancellation',
      timeoutMs: 5000 // Cancel after 5 seconds
    }
  });
} catch (error) {
  console.log('Workflow was cancelled');
}
```

### Human-in-the-Loop Approval

```typescript
import { run, requiresApproval, waitForApproval } from '@cortex-os/service-orchestration';

const workflow = {
  graph: { start: ['review'], review: ['deploy'], deploy: [] },
  steps: {
    start: async () => ({ changes: ['file1.ts', 'file2.ts'] }),
    review: async () => {
      const proposal = { 
        action: 'deploy',
        files: ['file1.ts', 'file2.ts'],
        classification: 'sensitive'
      };
      
      if (requiresApproval(proposal)) {
        const approved = await waitForApproval('workflow-1', 'review', proposal);
        if (!approved) {
          throw new Error('Deployment rejected by reviewer');
        }
      }
    },
    deploy: async () => console.log('Deploying changes')
  }
};

await run(workflow);
```

## API Reference

### Core Functions

#### `run(workflow, options?)`

Executes a workflow with the given options.

**Parameters:**
- `workflow: Workflow` - The workflow definition
- `options?: RunOptions` - Execution options

**Returns:** `Promise<void>`

### Workflow Definition

```typescript
interface Workflow {
  graph: Graph;                                    // DAG structure
  steps: Record<string, StepFn>;                  // Step implementations
  branches?: Record<string, BranchConfig>;        // Conditional branching
  loops?: Record<string, LoopConfig>;            // Loop/map operations
  hooks?: HookManager;                           // Lifecycle hooks
  compensation?: CompensationManager;            // Rollback operations
}
```

### Run Options

```typescript
interface RunOptions {
  concurrency?: number;              // Max concurrent steps
  retry?: Record<string, RetryPolicy>; // Per-step retry policies
  signal?: AbortSignal;             // Cancellation signal
  workflowId?: string;             // Workflow identifier
  cancellation?: CancellationOptions; // Cancellation config
}
```

### Hooks System

The `HookManager` class provides lifecycle hooks:

```typescript
const hooks = new HookManager();

// Step-level hooks
hooks.addPreStepHook('stepId', async (ctx) => { /* before step */ });
hooks.addPostStepHook('stepId', async (ctx) => { /* after step */ });
hooks.addStepErrorHook('stepId', async (ctx) => { /* on step error */ });

// Global hooks (apply to all steps)
hooks.addGlobalPreStepHook(async (ctx) => { /* before any step */ });
hooks.addGlobalPostStepHook(async (ctx) => { /* after any step */ });
hooks.addGlobalStepErrorHook(async (ctx) => { /* on any step error */ });

// Workflow-level hooks
hooks.addPreWorkflowHook(async (ctx) => { /* before workflow */ });
hooks.addPostWorkflowHook(async (ctx) => { /* after workflow */ });
hooks.addWorkflowErrorHook(async (ctx) => { /* on workflow error */ });
hooks.addWorkflowCancelledHook(async (ctx) => { /* on cancellation */ });
```

### Compensation System

The `CompensationManager` handles rollback operations:

```typescript
const compensation = new CompensationManager();

// Register compensation for a step
compensation.registerCompensation('stepId', async (ctx) => {
  // Undo operations performed by stepId
});

// Add compensation lifecycle hooks
compensation.addCompensationStartHook(async (ctx) => {
  // Called when compensation begins
});

compensation.addCompensationCompleteHook(async (ctx) => {
  // Called when compensation completes
});
```

### Cancellation System

Advanced cancellation with cleanup and timeout support:

```typescript
import { CancellationController, withCancellation } from '@cortex-os/service-orchestration';

// Create a cancellation controller
const controller = new CancellationController();

// Cancel with custom reason
controller.cancel('User requested cancellation');

// Automatic timeout cancellation
const timeoutController = CancellationController.withTimeout(5000);

// Wrap operations for cancellation support
const result = await withCancellation(
  async (signal) => {
    // Your async operation
    return await longRunningTask(signal);
  },
  controller.signal,
  { timeoutMs: 10000 }
);
```

## Architecture

The orchestration engine is built with several key components:

### 1. DAG Executor
- Validates workflow graphs for cycles
- Performs topological sorting for execution order
- Handles step dependencies and parallel execution

### 2. Hook System
- Provides 13+ hook points for workflow lifecycle
- Supports both step-level and global hooks
- Error isolation - hook failures don't break workflows

### 3. Compensation Framework
- Implements the saga pattern for distributed transactions
- LIFO (last-in-first-out) compensation ordering
- Automatic rollback on failures

### 4. Cancellation Engine
- Timeout-based cancellation
- Resource cleanup hooks
- Partial rollback for executed steps
- Standard AbortSignal integration

### 5. HITL Support
- Human approval workflows
- Configurable timeout handling
- Type-safe proposal/decision system

## Testing

The package includes comprehensive test coverage:

- **99 tests** across all modules
- **~90% code coverage** on core modules
- Unit tests for each component
- Integration tests for feature interactions
- Edge case and error condition testing

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test --coverage
```

## Best Practices

### 1. Step Design
- Keep steps focused and single-purpose
- Handle `AbortSignal` for cancellation support
- Use compensation for idempotent rollbacks

### 2. Error Handling
- Register compensation for reversible operations
- Use hooks for observability and logging
- Handle cancellation gracefully

### 3. Performance
- Leverage parallel execution for independent steps
- Use appropriate concurrency limits
- Monitor step execution times

### 4. Observability
- Add comprehensive logging hooks
- Include tracing context in metadata
- Monitor compensation execution

## Contributing

This package follows strict TDD practices:

1. Write failing tests first
2. Implement minimal code to pass
3. Refactor while keeping tests green
4. Use conventional commits
5. Maintain high test coverage

## License

Part of the Cortex-OS project. See the main project license for details.