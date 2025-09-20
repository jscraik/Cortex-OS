/**
 * @fileoverview Cortex-OS Observability Package
 * OTEL spans, metrics, logs with ULID propagation
 */

export { createObservabilityBus } from './events/observability-bus.js';
export type {
	ObservabilityBus,
	ObservabilityEventEnvelope,
	ObservabilityEventHandler,
	ObservabilityPublishOptions
} from './events/observability-bus.js';
// A2A Events for inter-package communication
export {
	AlertTriggeredEventSchema, MetricRecordedEventSchema,
	OBSERVABILITY_EVENT_SCHEMAS,
	OBSERVABILITY_EVENT_TYPES,
	TraceCompletedEventSchema,
	TraceCreatedEventSchema, createObservabilityEvent
} from './events/observability-events.js';
export type {
	AlertTriggeredEvent,
	MetricRecordedEvent,
	TraceCompletedEvent,
	TraceCreatedEvent
} from './events/observability-events.js';
export * from './flamegraph.js';
export * from './logging/index.js';
export {
	createObservabilityToolHandlers,
	createObservabilityToolRuntime
} from './mcp/runtime.js';
export type {
	AlertEvaluationResult,
	AlertRule,
	DashboardDefinition,
	DashboardSummary,
	LogRecord,
	LogSearchResult,
	MetricRecord,
	MetricRetrievalResult,
	ObservabilityDataset,
	ObservabilityToolHandlers,
	ObservabilityToolRuntime,
	TraceQueryResult,
	TraceRecord
} from './mcp/runtime.js';
// MCP Tools for external AI agent integration
export { observabilityMcpTools } from './mcp/tools.js';
export type {
	EvaluateAlertInput,
	GenerateDashboardInput,
	GetMetricsInput,
	ObservabilityTool,
	QueryTracesInput,
	SearchLogsInput
} from './mcp/tools.js';
export * from './metrics/index.js';
export * from './tracing/index.js';
export * from './types.js';
export * from './ulids.js';
// Back-compat/alias names expected by tests
export type TraceQueryInput = import('./mcp/tools.js').QueryTracesInput;
export type MetricRetrievalInput = import('./mcp/tools.js').GetMetricsInput;
export type AlertQueryInput = import('./mcp/tools.js').EvaluateAlertInput;
export type DashboardRequestInput = import('./mcp/tools.js').GenerateDashboardInput;

