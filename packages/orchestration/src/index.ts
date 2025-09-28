/**
 * Cortex OS Orchestration Package
 * Focused n0 LangGraph surface for state + dispatch utilities.
 */

export {
	N0BudgetSchema,
	N0SessionSchema,
	N0StateSchema,
	createInitialN0State,
	mergeN0State,
} from './langgraph/n0-state.js';
export type { N0Budget, N0Session, N0State } from './langgraph/n0-state.js';

export {
	agentStateToN0,
	cortexStateToN0,
	workflowStateToN0,
} from './langgraph/n0-adapters.js';
export type {
	AdapterOptions as N0AdapterOptions,
	AgentStateLike as N0AgentStateLike,
	CortexStateLike as N0CortexStateLike,
	WorkflowStateLike as N0WorkflowStateLike,
} from './langgraph/n0-adapters.js';

export { runSpool } from './langgraph/spool.js';
export type {
	SpoolResult,
	SpoolRunOptions,
	SpoolStatus,
	SpoolTask,
} from './langgraph/spool.js';

export { dispatchTools } from './langgraph/tool-dispatch.js';
export type {
        ToolDispatchHooks,
        ToolDispatchJob,
        ToolDispatchOptions,
        ToolDispatchResult,
} from './langgraph/tool-dispatch.js';

export {
        buildN0,
        type BuildN0Options,
        type BuildN0Result,
        type PlanDecision,
        type StreamEvent,
        type ToolCallableModel,
        type ToolDefinition,
        type ToolExecutionContext,
        type ToolExecutionOutput,
} from './langgraph/n0-graph.js';

export { createCerebrumGraph } from './langgraph/create-cerebrum-graph.js';
export {
        MultiAgentCoordinator,
} from './langgraph/multi-agent-coordinator.js';
export type {
        AgentHandoffRecord,
        DistributedWorkflowRequest,
        DistributedWorkflowResult,
        LangGraphRunner,
        MultiAgentCoordinatorMetrics,
        MultiAgentCoordinatorOptions,
        MultiAgentEvent,
        MultiAgentEventPublisher,
        MultiAgentEventType,
        RegisterWorkflowOptions,
        StateSharedEvent,
        WorkflowCompletedEvent,
} from './langgraph/multi-agent-coordinator.js';

export {
        LangGraphStreamCoordinator,
        streamGraphEvents,
        streamGraphUpdates,
} from './langgraph/streaming.js';
export type {
        LangGraphStreamEnvelope,
        LangGraphStreamOptions,
        LangGraphStreamResult,
        StreamClient,
        StreamableStateGraph,
} from './langgraph/streaming.js';

export { SecurityCoordinator, type ComplianceEvaluationResult } from './security/security-coordinator.js';

// Utility defaults
export const OrchestrationDefaults = {
	maxConcurrentOrchestrations: 10,
	defaultStrategy: 'adaptive' as const,
	planningTimeout: 300_000, // 5 minutes
	executionTimeout: 1_800_000, // 30 minutes
	qualityThreshold: 0.8,
	confidenceThreshold: 0.7,
};

// Version info
export const version = '1.0.0';
export const name = '@cortex-os/orchestration';
