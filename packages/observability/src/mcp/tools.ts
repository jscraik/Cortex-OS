import { z } from 'zod';
import { LogLevelSchema, TraceContextSchema, ULIDSchema } from '../types.js';

// Observability MCP Tool Schemas
export const CreateTraceInputSchema = z.object({
	traceId: z.string(),
	operationName: z.string(),
	service: z.string().optional(),
	tags: z.record(z.string()).optional(),
	startTime: z.string().optional(),
});

export const RecordMetricInputSchema = z.object({
	name: z.string(),
	value: z.number(),
	tags: z.record(z.string()).optional(),
	timestamp: z.string().optional(),
	unit: z.string().optional(),
});

export const QueryTracesInputSchema = z.object({
	service: z.string().optional(),
	operation: z.string().optional(),
	status: z.enum(['success', 'error']).optional(),
	startTime: z.string().optional(),
	endTime: z.string().optional(),
	tags: z.record(z.string()).optional(),
	limit: z.number().int().positive().max(200).default(50),
});

const aggregationModes = ['sum', 'avg', 'count', 'max', 'min'] as const;

export const GetMetricsInputSchema = z.object({
	name: z.string().optional(),
	startTime: z.string().optional(),
	endTime: z.string().optional(),
	labels: z.record(z.string()).optional(),
	aggregation: z.enum(aggregationModes).optional(),
	limit: z.number().int().positive().max(200).default(100),
});

export const SearchLogsInputSchema = z.object({
	query: z.string().min(1).max(200).optional(),
	level: LogLevelSchema.optional(),
	component: z.string().optional(),
	runId: ULIDSchema.optional(),
	traceId: z.string().optional(),
	traceContext: TraceContextSchema.optional(),
	tags: z.record(z.string()).optional(),
	startTime: z.string().optional(),
	endTime: z.string().optional(),
	limit: z.number().int().positive().max(200).default(50),
});

export const EvaluateAlertInputSchema = z.object({
	alertId: z.string(),
	metricWindow: z
		.object({
			metric: z.string().optional(),
			aggregation: z.enum(aggregationModes).optional(),
			startTime: z.string().optional(),
			endTime: z.string().optional(),
		})
		.optional(),
});

export const GenerateDashboardInputSchema = z.object({
	dashboardId: z.string(),
	include: z
		.array(z.enum(['metrics', 'logs', 'traces', 'alerts']))
		.min(1)
		.optional(),
	timeRange: z
		.object({
			start: z.string().optional(),
			end: z.string().optional(),
		})
		.optional(),
	limit: z.number().int().positive().max(200).default(25),
});

// Observability MCP Tool Definitions
export interface ObservabilityTool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
}

export const observabilityMcpTools: ObservabilityTool[] = [
	{
		name: 'create_trace',
		description: 'Create a new distributed trace',
		inputSchema: CreateTraceInputSchema,
	},
	{
		name: 'record_metric',
		description: 'Record a metric value',
		inputSchema: RecordMetricInputSchema,
	},
	{
		name: 'query_traces',
		description: 'Query traces by service, operation, and time range',
		inputSchema: QueryTracesInputSchema,
	},
	{
		name: 'get_metrics',
		description: 'Retrieve metrics with optional aggregation',
		inputSchema: GetMetricsInputSchema,
	},
	{
		name: 'search_logs',
		description: 'Search structured logs with filtering and redaction',
		inputSchema: SearchLogsInputSchema,
	},
	{
		name: 'evaluate_alert',
		description: 'Evaluate alerting rules against recent telemetry',
		inputSchema: EvaluateAlertInputSchema,
	},
	{
		name: 'generate_dashboard',
		description:
			'Generate observability dashboards with metrics, logs, and traces',
		inputSchema: GenerateDashboardInputSchema,
	},
];

// Export types for external use
export type AggregationMode = (typeof aggregationModes)[number];
