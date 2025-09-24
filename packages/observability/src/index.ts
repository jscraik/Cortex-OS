/**
 * @fileoverview Cortex-OS Observability Package
 * OTEL spans, metrics, logs with ULID propagation
 */

export type {
	ObservabilityBus,
	ObservabilityEventEnvelope,
	ObservabilityEventHandler,
	ObservabilityPublishOptions,
} from './events/observability-bus.js';
export { createObservabilityBus } from './events/observability-bus.js';
export type {
	AlertTriggeredEvent,
	MetricRecordedEvent,
	TraceCompletedEvent,
	TraceCreatedEvent,
} from './events/observability-events.js';
// A2A Events for inter-package communication
export {
	AlertTriggeredEventSchema,
	createObservabilityEvent,
	MetricRecordedEventSchema,
	OBSERVABILITY_EVENT_SCHEMAS,
	OBSERVABILITY_EVENT_TYPES,
	TraceCompletedEventSchema,
	TraceCreatedEventSchema,
} from './events/observability-events.js';
export * from './flamegraph.js';
export * from './logging/index.js';
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
	TraceRecord,
} from './mcp/runtime.js';
export {
	createObservabilityToolHandlers,
	createObservabilityToolRuntime,
} from './mcp/runtime.js';
export type {
	EvaluateAlertInput,
	GenerateDashboardInput,
	GetMetricsInput,
	ObservabilityTool,
	QueryTracesInput,
	SearchLogsInput,
} from './mcp/tools.js';
// MCP Tools for external AI agent integration
export { observabilityMcpTools } from './mcp/tools.js';
export * from './metrics/index.js';
export * from './tracing/index.js';
export * from './types.js';
export * from './ulids.js';
// Back-compat/alias names expected by tests
export type TraceQueryInput = import('./mcp/tools').QueryTracesInput;
export type MetricRetrievalInput = import('./mcp/tools').GetMetricsInput;
export type AlertQueryInput = import('./mcp/tools').EvaluateAlertInput;
export type DashboardRequestInput = import('./mcp/tools').GenerateDashboardInput;
