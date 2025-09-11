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

// Re-export observability types that are commonly used
export type { Span, Tracer } from '@opentelemetry/api';
// Cancellation system
export {
  CancellationController,
  CancellationError, isCancellationError,
  withCancellation, type CancellationOptions,
  type CancellationResult
} from './lib/cancellation';
// Compensation system (saga pattern)
export {
  CompensationManager, SagaManager, compensationPatterns, type CompensationAction,
  type CompensationContext,
  type CompensationFn, type CompensationRegistry
} from './lib/compensation';
// DAG utilities
export { topoSort, validateDAG, type Graph } from './lib/dag';
// Core workflow execution
export {
  run, type BranchConfig,
  type LoopConfig,
  type RetryPolicy,
  type RunOptions, type StepFn,
  type Workflow
} from './lib/executor';

// Human-in-the-loop (HITL)
export {
  requiresApproval,
  submitDecision,
  waitForApproval
} from './lib/hitl';
// Hooks system
export {
  HookManager, commonHooks,
  createHookRegistry,
  type HookContext,
  type HookFn, type HookRegistry,
  type WorkflowHookContext,
  type WorkflowHookFn
} from './lib/hooks';

