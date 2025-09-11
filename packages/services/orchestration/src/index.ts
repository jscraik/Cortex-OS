/**
 * @cortex-os/service-orchestration
 * 
 * A robust workflow orchestration engine for Cortex-OS with advanced features:
 * - DAG-based workflow execution with topological ordering
 * - Conditional branching and loop/map semantics
 * - Comprehensive hooks system for lifecycle events
 * - Compensation framework (saga pattern) for rollback operations
 * - Advanced cancellation with timeout and cleanup support
 * - Human-in-the-loop (HITL) workflow support
 * - Retry policies and error handling
 */

// Core workflow execution
export { run, type Workflow, type StepFn, type RunOptions, type BranchConfig, type LoopConfig, type RetryPolicy } from './lib/executor';

// DAG utilities
export { topoSort, validateDAG, type Graph } from './lib/dag';

// Hooks system
export { 
  HookManager, 
  createHookRegistry, 
  commonHooks,
  type HookRegistry,
  type HookContext,
  type WorkflowHookContext,
  type HookFn,
  type WorkflowHookFn
} from './lib/hooks';

// Compensation system (saga pattern)
export {
  CompensationManager,
  SagaManager,
  compensationPatterns,
  type CompensationRegistry,
  type CompensationContext,
  type CompensationFn,
  type CompensationAction
} from './lib/compensation';

// Cancellation system
export {
  CancellationController,
  CancellationError,
  isCancellationError,
  withCancellation,
  type CancellationOptions,
  type CancellationResult
} from './lib/cancellation';

// Human-in-the-loop (HITL)
export {
  requiresApproval,
  waitForApproval,
  submitDecision
} from './lib/hitl';

// Re-export observability types that are commonly used
export type { Span, Tracer } from '@opentelemetry/api';