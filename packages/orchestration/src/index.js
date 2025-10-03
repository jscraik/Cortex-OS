/**
 * Cortex OS Orchestration Package
 * Focused n0 LangGraph surface for state + dispatch utilities.
 */
export { createCerebrumGraph } from './langgraph/create-cerebrum-graph.js';
export { withThermalGuard } from './langgraph/middleware/thermal-guard.js';
export { agentStateToN0, cortexStateToN0, workflowStateToN0 } from './langgraph/n0-adapters.js';
export { buildN0 } from './langgraph/n0-graph.js';
export {
	compactN0State,
	createInitialN0State,
	mergeN0State,
	N0BudgetSchema,
	N0SessionSchema,
	N0StateSchema,
} from './langgraph/n0-state.js';
export { runSpool } from './langgraph/spool.js';
export {
	applyThermalDecision,
	enqueueThermalEvent,
	getThermalContext,
	holdForCooldown,
	markThermalResume,
	THERMAL_CTX_KEY,
} from './langgraph/state/thermal-history.js';
export {
	ThermalEventSchema,
	ThermalLevelSchema,
	ThermalPolicy,
} from './langgraph/thermal/thermal-policy.js';
export { dispatchTools } from './langgraph/tool-dispatch.js';
export { createHookAwareDispatcher, createUnifiedToolSystem } from './langgraph/tool-system.js';
export { SecurityCoordinator } from './security/security-coordinator.js';
export { OrchestrationService, provideOrchestration } from './service.js';
// Utility defaults
export const OrchestrationDefaults = {
	maxConcurrentOrchestrations: 10,
	defaultStrategy: 'adaptive',
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
//# sourceMappingURL=index.js.map
