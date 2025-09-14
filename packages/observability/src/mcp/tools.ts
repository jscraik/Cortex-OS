import { z } from 'zod';

// Observability MCP Tool Schemas
const CreateTraceInputSchema = z.object({
	traceId: z.string(),
	operationName: z.string(),
	tags: z.record(z.string()).optional(),
	startTime: z.string().optional(),
});

const RecordMetricInputSchema = z.object({
	name: z.string(),
	value: z.number(),
	tags: z.record(z.string()).optional(),
	timestamp: z.string().optional(),
});

const QueryTracesInputSchema = z.object({
	service: z.string().optional(),
	operation: z.string().optional(),
	startTime: z.string().optional(),
	endTime: z.string().optional(),
	tags: z.record(z.string()).optional(),
});

const GetMetricsInputSchema = z.object({
	name: z.string().optional(),
	startTime: z.string().optional(),
	endTime: z.string().optional(),
	aggregation: z.enum(['sum', 'avg', 'count', 'max', 'min']).optional(),
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
];

// Export types for external use
export type CreateTraceInput = z.infer<typeof CreateTraceInputSchema>;
export type RecordMetricInput = z.infer<typeof RecordMetricInputSchema>;
export type QueryTracesInput = z.infer<typeof QueryTracesInputSchema>;
export type GetMetricsInput = z.infer<typeof GetMetricsInputSchema>;
