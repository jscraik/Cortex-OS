/**
 * Cortex OS Orchestration Package
 * Simplified exports focusing on PRP neural orchestration with Archon integration
 */

export type {
	OrchestrationBus,
	OrchestrationEventEnvelope,
	OrchestrationEventHandler,
	OrchestrationPublishOptions,
} from './events/orchestration-bus.js';
export { createOrchestrationBus } from './events/orchestration-bus.js';
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
export {
	ORCHESTRATION_EVENT_SCHEMAS,
	OrchestrationEventTypes,
} from './events/orchestration-events.js';

export type {
	ArchonTaskManagerConfig,
	OrchestrationTask,
	TaskManagerEvents,
} from './integrations/archon-task-manager.js';
// Archon Task Manager Integration
export {
	ArchonTaskManager,
	createArchonTaskManager,
	createOrchestrationArchonIntegration,
	OrchestrationArchonIntegration,
} from './integrations/archon-task-manager.js';
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

export type {
	AssignTaskInput,
	AssignTaskResult,
	CreateTaskInput,
	CreateTaskResult,
	GetProcessStatusInput,
	GetProcessStatusResult,
	PlanWorkflowInput,
	PlanWorkflowResult,
	RecordProcessSignalInput,
	RecordProcessSignalResult,
	ReviewWorkflowInput,
	ReviewWorkflowResult,
	StartWorkflowInput,
	StartWorkflowResult,
	StreamProcessEventsInput,
	StreamProcessEventsResult,
	ToolContract,
	ToolErrorResponse,
	UpdateTaskStatusInput,
	UpdateTaskStatusResult,
} from './mcp/tools.js';
// MCP tool contracts
export {
	createToolErrorResponse,
	orchestrationToolContracts,
	processMonitoringTools,
	ToolErrorCode,
	ToolValidationError,
	taskManagementTools,
	toolErrorResponseSchema,
	workflowOrchestrationTools,
} from './mcp/tools.js';

// Version info
export const version = '1.0.0';
export const name = '@cortex-os/orchestration';

export type { MLXAgentCapabilities } from './integrations/mlx-agent.js';

// MLX agent integration
export { MLXAgent } from './integrations/mlx-agent.js';
// MCP tool exports
export {
	orchestrationMcpTools,
	processMonitoringTool,
	taskManagementTool,
	workflowOrchestrationTool,
} from './mcp/tools.js';
// PRP Neural Orchestration Engine
export { cleanup, createEngine, orchestrateTask } from './prp-integration.js';

// LangGraph foundation (Phase 2)
export { createCerebrumGraph } from './langgraph/create-cerebrum-graph.js';
