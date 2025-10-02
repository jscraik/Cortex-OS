/**
 * Cortex OS Orchestration Package
 * Focused n0 LangGraph surface for state + dispatch utilities.
 */

export { createCerebrumGraph } from './langgraph/create-cerebrum-graph.js';
export type {
	ThermalGuardOptions,
	ThermalGuardState,
} from './langgraph/middleware/thermal-guard.js';
export { withThermalGuard } from './langgraph/middleware/thermal-guard.js';
export type {
	AdapterOptions as N0AdapterOptions,
	AgentStateLike as N0AgentStateLike,
	CortexStateLike as N0CortexStateLike,
	WorkflowStateLike as N0WorkflowStateLike,
} from './langgraph/n0-adapters.js';
export {
	agentStateToN0,
	cortexStateToN0,
	workflowStateToN0,
} from './langgraph/n0-adapters.js';
export {
	type BuildN0Options,
	type BuildN0Result,
	buildN0,
	type PlanDecision,
	type StreamEvent,
	type ToolCallableModel,
	type ToolDefinition,
	type ToolExecutionContext,
	type ToolExecutionOutput,
} from './langgraph/n0-graph.js';
export type {
	MemoryCompactionOptions,
	MemoryCompactionResult,
	N0Budget,
	N0Session,
	N0State,
} from './langgraph/n0-state.js';
export {
	compactN0State,
	createInitialN0State,
	mergeN0State,
	N0BudgetSchema,
	N0SessionSchema,
	N0StateSchema,
} from './langgraph/n0-state.js';
export type {
	SpoolResult,
	SpoolRunOptions,
	SpoolStatus,
	SpoolTask,
} from './langgraph/spool.js';
export { runSpool } from './langgraph/spool.js';
export type { ThermalCheckpoint, ThermalContext } from './langgraph/state/thermal-history.js';
export {
	applyThermalDecision,
	enqueueThermalEvent,
	getThermalContext,
	holdForCooldown,
	markThermalResume,
	THERMAL_CTX_KEY,
} from './langgraph/state/thermal-history.js';
export type {
	ThermalEvent,
	ThermalLevel,
	ThermalPolicyConfig,
} from './langgraph/thermal/thermal-policy.js';
export {
	ThermalEventSchema,
	ThermalLevelSchema,
	ThermalPolicy,
} from './langgraph/thermal/thermal-policy.js';
export type {
	ToolDispatchHooks,
	ToolDispatchJob,
	ToolDispatchOptions,
	ToolDispatchProgressEvent,
	ToolDispatchProgressHandler,
	ToolDispatchResult,
} from './langgraph/tool-dispatch.js';
export { dispatchTools } from './langgraph/tool-dispatch.js';
export type {
	HookAwareDispatcher,
	HookAwareDispatcherOptions,
	HookRunner,
	UnifiedToolSystem,
	UnifiedToolSystemOptions,
} from './langgraph/tool-system.js';
export {
	createHookAwareDispatcher,
	createUnifiedToolSystem,
} from './langgraph/tool-system.js';
export {
	type ComplianceEvaluationResult,
	SecurityCoordinator,
} from './security/security-coordinator.js';
export {
	type OrchestrationFacade,
	OrchestrationService,
	provideOrchestration,
} from './service.js';

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

// Re-export A2A/events and MCP tool surface expected by public API snapshot tests
export { createOrchestrationBus } from './events/orchestration-bus.js';
export {
	ORCHESTRATION_EVENT_SCHEMAS,
	OrchestrationEventTypes,
} from './events/orchestration-events.js';
// Re-export tool error types so they are part of the public surface
export { ToolErrorCode, ToolValidationError } from './mcp/tool-errors.js';
// Re-export MCP tools and helpers
export {
	createToolErrorResponse,
	orchestrationMcpTools,
	orchestrationSecurityToolAllowList,
	orchestrationToolContracts,
	processMonitoringTool,
	taskManagementTool,
	toolErrorResponseSchema,
	workflowOrchestrationTool,
} from './mcp/tools.js';
