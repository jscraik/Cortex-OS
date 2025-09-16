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
        EvaluateAlertInput,
        GenerateDashboardInput,
        GetMetricsInput,
        AggregationMode,
        ObservabilityTool,
        QueryTracesInput,
        RecordMetricInput,
        SearchLogsInput,
} from './mcp/tools.js';
export { observabilityMcpTools } from './mcp/tools.js';
export {
        createObservabilityToolHandlers,
        createObservabilityToolRuntime,
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
        TraceRecord,
} from './mcp/runtime.js';
export * from './metrics/index.js';
export * from './tracing/index.js';
export * from './types.js';
export * from './ulids.js';
