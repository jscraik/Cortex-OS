/**
 * @fileoverview Cortex-OS Observability Package
 * OTEL spans, metrics, logs with ULID propagation
 */

// A2A Events for inter-package communication
export type {
	AlertTriggeredEvent,
	MetricRecordedEvent,
	TraceCompletedEvent,
	TraceCreatedEvent,
} from './events/observability-events.js';
export {
	AlertTriggeredEventSchema,
	createObservabilityEvent,
	MetricRecordedEventSchema,
	TraceCompletedEventSchema,
	TraceCreatedEventSchema,
} from './events/observability-events.js';
export * from './flamegraph.js';
export * from './logging/index.js';
// MCP Tools for external AI agent integration
export type {
	CreateTraceInput,
	GetMetricsInput,
	ObservabilityTool,
	QueryTracesInput,
	RecordMetricInput,
} from './mcp/tools.js';
export { observabilityMcpTools } from './mcp/tools.js';
export * from './metrics/index.js';
export * from './tracing/index.js';
export * from './types.js';
export * from './ulids.js';
