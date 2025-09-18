/**
 * Cortex OS Orchestration Package
 * LangGraph-only orchestration surface (no legacy orchestrator exports)
 */

export { createOrchestrationBus } from './events/orchestration-bus.js';
export type {
	OrchestrationBus,
	OrchestrationEventEnvelope,
	OrchestrationEventHandler,
	OrchestrationPublishOptions,
} from './events/orchestration-bus.js';
export {
	ORCHESTRATION_EVENT_SCHEMAS,
	OrchestrationEventTypes,
} from './events/orchestration-events.js';
export type {
	AgentAssignedEvent,
	AgentFreedEvent,
	CoordinationStartedEvent,
	DecisionMadeEvent,
	OrchestrationEventType,
	PlanCreatedEvent,
	PlanUpdatedEvent,
	ResourceAllocatedEvent,
	TaskCompletedEvent,
	TaskCreatedEvent,
	TaskFailedEvent,
	TaskStartedEvent,
} from './events/orchestration-events.js';

// Legacy integrations removed (LangGraph-only)
// Core types and interfaces
// Enum types
export type {
	AdaptiveConfig,
	AdaptiveDecision,
	Agent,
	AgentCapability,
	CoordinationResult,
	DatabaseConfig,
	DecisionContext,
	ExecutionPlan,
	LangChainConfig,
	LangChainResult,
	LangChainTool,
	LearningPattern,
	MessageProtocol,
	MultiAgentConfig,
	MultiAgentState,
	Neo4jConfig,
	OrchestrationConfig,
	OrchestrationEvent,
	OrchestrationResult,
	OrchestrationState,
	OrchestrationStatistics,
	PerformanceMetrics,
	PlanningContext,
	PlanningResult,
	QdrantConfig,
	StrategicDecision,
	SynchronizationPoint,
	Task,
} from './types.js';
// Enums
export {
	AgentRole,
	CoordinationStrategy,
	DecisionStrategy,
	OrchestrationStrategy,
	Schemas,
} from './types.js';

// Utility defaults
export const OrchestrationDefaults = {
	maxConcurrentOrchestrations: 10,
	defaultStrategy: 'adaptive' as const,
	planningTimeout: 300000, // 5 minutes
	executionTimeout: 1800000, // 30 minutes
	qualityThreshold: 0.8,
	confidenceThreshold: 0.7,
};

export type { ToolContract, ToolErrorResponse } from './mcp/tools.js';
// MCP tool contracts
export {
	createToolErrorResponse,
	orchestrationToolContracts,
	processMonitoringTools,
	taskManagementTools,
	ToolErrorCode,
	toolErrorResponseSchema,
	ToolValidationError,
	workflowOrchestrationTools,
} from './mcp/tools.js';

// Version info
export const version = '1.0.0';
export const name = '@cortex-os/orchestration';

// LangGraph-only: MLX agent integration removed from public surface
// LangGraph foundation (Phase 2)
export { createCerebrumGraph } from './langgraph/create-cerebrum-graph.js';
// MCP tool exports
export {
	orchestrationMcpTools,
	processMonitoringTool,
	taskManagementTool,
	workflowOrchestrationTool,
} from './mcp/tools.js';
// LangGraph-only: legacy engines are no longer exported
