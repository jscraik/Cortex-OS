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
	CancellationError,
	type CancellationOptions,
	type CancellationResult,
	isCancellationError,
	withCancellation,
} from './lib/cancellation.js';
// Compensation system (saga pattern)
export {
	type CompensationAction,
	type CompensationContext,
	type CompensationFn,
	CompensationManager,
	type CompensationRegistry,
	compensationPatterns,
	SagaManager,
} from './lib/compensation.js';
// DAG utilities
export { type Graph, topoSort, validateDAG } from './lib/dag.js';
// Core workflow execution
export {
	type BranchConfig,
	type LoopConfig,
	type RetryPolicy,
	type RunOptions,
	run,
	type StepFn,
	type Workflow,
} from './lib/executor.js';

// Human-in-the-loop (HITL)
export {
	requiresApproval,
	submitDecision,
	waitForApproval,
} from './lib/hitl.js';
// Hooks system
export {
	commonHooks,
	createHookRegistry,
	type HookContext,
	type HookFn,
	HookManager,
	type HookRegistry,
	type WorkflowHookContext,
	type WorkflowHookFn,
} from './lib/hooks.js';
