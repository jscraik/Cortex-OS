/**
 * Cortex OS Orchestration Package
 * LangGraph-only orchestration surface (no legacy orchestrator exports)
 */

export type {
	AgentConfiguration,
	AgentNetwork,
	AgentPool,
	AgentSchedule,
	AgentState,
	ExecutionFeedback as NoExecutionFeedback,
	ExecutionPlan as NoExecutionPlan,
	// Schema Types (aliased to avoid conflicts)
	ExecutionRequest as NoExecutionRequest,
	ExecutionResult,
	ExecutionStatus as NoExecutionStatus,
	// Core Contracts
	IntelligenceScheduler,
	MasterAgentLoop,
	StrategyAdjustment,
	ToolCapability,
	ToolLayer,
	ToolManifest,
	ToolResult,
} from './contracts/no-architecture-contracts.js';
// nO Architecture Contracts
export {
	AgentConfigurationSchema,
	AgentNetworkSchema,
	AgentPoolSchema,
	AgentScheduleSchema,
	AgentStateSchema,
	ExecutionFeedbackSchema,
	ExecutionPlanSchema as NoExecutionPlanSchema,
	// Schema Exports
	ExecutionRequestSchema,
	ExecutionResultSchema,
	ExecutionStatusSchema,
	// Interface Schemas
	IntelligenceSchedulerSchema,
	MasterAgentLoopSchema,
	StrategyAdjustmentSchema,
	ToolCapabilitySchema,
	ToolLayerSchema,
	ToolManifestSchema,
	ToolResultSchema,
} from './contracts/no-architecture-contracts.js';
export type {
	OrchestrationBus,
	OrchestrationEventEnvelope,
	OrchestrationEventHandler,
	OrchestrationPublishOptions,
} from './events/orchestration-bus.js';
export { createOrchestrationBus } from './events/orchestration-bus.js';
export type {
	AgentAssignedEvent,
	// nO Architecture Event Types
	AgentCoordinationStartedEvent,
	AgentFreedEvent,
	CoordinationStartedEvent,
	DecisionMadeEvent,
	OrchestrationEventType,
	PlanCreatedEvent,
	PlanUpdatedEvent,
	ResourceAllocatedEvent,
	ScheduleAdjustedEvent,
	TaskCompletedEvent,
	TaskCreatedEvent,
	TaskFailedEvent,
	TaskStartedEvent,
	ToolLayerInvokedEvent,
} from './events/orchestration-events.js';
export {
	ORCHESTRATION_EVENT_SCHEMAS,
	OrchestrationEventTypes,
} from './events/orchestration-events.js';
export type {
	NoAuditAction,
	NoAuditActor,
	NoAuditCompliance,
	NoAuditEntry,
	NoAuditResource,
	NoMetricAggregation,
	NoMetricAlert,
	NoMetricContract,
	NoMetricDashboard,
	NoMetricLabels,
	NoSpanAttributes,
	NoSpanDefinition,
	NoSpanEvent,
	NoTelemetryContext,
	NoTelemetryEvent,
	NoTelemetryPayload,
} from './observability/no-telemetry-contracts.js';
// nO Telemetry & Observability Contracts
export {
	createNoAuditEntry,
	// Utility Functions
	createNoTelemetryEvent,
	NO_METRIC_NAMES,
	NO_SPAN_OPERATIONS,
	// Constants
	NO_TELEMETRY_EVENT_TYPES,
	NoAuditTrailSchema,
	NoMetricContractsSchema,
	NoSpanDefinitionsSchema,
	// Telemetry Schemas
	NoTelemetrySchema,
	validateNoAuditEntry,
	validateNoMetricContract,
	validateNoSpanDefinition,
	validateNoTelemetryEvent,
} from './observability/no-telemetry-contracts.js';

// Core types and interfaces
// Enum types
export type {
	AdaptiveDecision,
	Agent,
	AgentCapability,
	DecisionContext,
	ExecutionPlan,
	OrchestrationConfig,
	OrchestrationEvent,
	OrchestrationResult,
	OrchestrationState,
	PerformanceMetrics,
	PlanningContext,
	StrategicDecision,
	Task,
} from './types.js';
// Enums
export {
	AgentRole,
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
	ToolErrorCode,
	ToolValidationError,
	toolErrorResponseSchema,
} from './mcp/tools.js';

// Version info
export const version = '1.0.0';
export const name = '@cortex-os/orchestration';

// LangGraph foundation (Phase 2)
export { createCerebrumGraph } from './langgraph/create-cerebrum-graph.js';
// MCP tool exports
export {
	orchestrationMcpTools,
	processMonitoringTool,
	taskManagementTool,
	workflowOrchestrationTool,
} from './mcp/tools.js';
