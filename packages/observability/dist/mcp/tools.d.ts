import { z } from 'zod';
export declare const CreateTraceInputSchema: z.ZodObject<
	{
		traceId: z.ZodString;
		operationName: z.ZodString;
		service: z.ZodOptional<z.ZodString>;
		tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
		startTime: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		traceId: string;
		operationName: string;
		service?: string | undefined;
		startTime?: string | undefined;
		tags?: Record<string, string> | undefined;
	},
	{
		traceId: string;
		operationName: string;
		service?: string | undefined;
		startTime?: string | undefined;
		tags?: Record<string, string> | undefined;
	}
>;
export declare const RecordMetricInputSchema: z.ZodObject<
	{
		name: z.ZodString;
		value: z.ZodNumber;
		tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
		timestamp: z.ZodOptional<z.ZodString>;
		unit: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		value: number;
		name: string;
		tags?: Record<string, string> | undefined;
		timestamp?: string | undefined;
		unit?: string | undefined;
	},
	{
		value: number;
		name: string;
		tags?: Record<string, string> | undefined;
		timestamp?: string | undefined;
		unit?: string | undefined;
	}
>;
export declare const QueryTracesInputSchema: z.ZodObject<
	{
		service: z.ZodOptional<z.ZodString>;
		operation: z.ZodOptional<z.ZodString>;
		status: z.ZodOptional<z.ZodEnum<['success', 'error']>>;
		startTime: z.ZodOptional<z.ZodString>;
		endTime: z.ZodOptional<z.ZodString>;
		tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
		limit: z.ZodDefault<z.ZodNumber>;
	},
	'strip',
	z.ZodTypeAny,
	{
		limit: number;
		service?: string | undefined;
		startTime?: string | undefined;
		status?: 'error' | 'success' | undefined;
		tags?: Record<string, string> | undefined;
		operation?: string | undefined;
		endTime?: string | undefined;
	},
	{
		service?: string | undefined;
		startTime?: string | undefined;
		status?: 'error' | 'success' | undefined;
		tags?: Record<string, string> | undefined;
		operation?: string | undefined;
		endTime?: string | undefined;
		limit?: number | undefined;
	}
>;
declare const aggregationModes: readonly ['sum', 'avg', 'count', 'max', 'min'];
export declare const GetMetricsInputSchema: z.ZodObject<
	{
		name: z.ZodOptional<z.ZodString>;
		startTime: z.ZodOptional<z.ZodString>;
		endTime: z.ZodOptional<z.ZodString>;
		labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
		aggregation: z.ZodOptional<z.ZodEnum<['sum', 'avg', 'count', 'max', 'min']>>;
		limit: z.ZodDefault<z.ZodNumber>;
	},
	'strip',
	z.ZodTypeAny,
	{
		limit: number;
		startTime?: string | undefined;
		name?: string | undefined;
		endTime?: string | undefined;
		labels?: Record<string, string> | undefined;
		aggregation?: 'min' | 'max' | 'sum' | 'avg' | 'count' | undefined;
	},
	{
		startTime?: string | undefined;
		name?: string | undefined;
		endTime?: string | undefined;
		limit?: number | undefined;
		labels?: Record<string, string> | undefined;
		aggregation?: 'min' | 'max' | 'sum' | 'avg' | 'count' | undefined;
	}
>;
export declare const SearchLogsInputSchema: z.ZodObject<
	{
		query: z.ZodOptional<z.ZodString>;
		level: z.ZodOptional<z.ZodEnum<['trace', 'debug', 'info', 'warn', 'error', 'fatal']>>;
		component: z.ZodOptional<z.ZodString>;
		runId: z.ZodOptional<z.ZodString>;
		traceId: z.ZodOptional<z.ZodString>;
		traceContext: z.ZodOptional<
			z.ZodObject<
				{
					runId: z.ZodString;
					traceId: z.ZodOptional<z.ZodString>;
					spanId: z.ZodOptional<z.ZodString>;
					parentSpanId: z.ZodOptional<z.ZodString>;
				},
				'strip',
				z.ZodTypeAny,
				{
					runId: string;
					traceId?: string | undefined;
					spanId?: string | undefined;
					parentSpanId?: string | undefined;
				},
				{
					runId: string;
					traceId?: string | undefined;
					spanId?: string | undefined;
					parentSpanId?: string | undefined;
				}
			>
		>;
		tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
		startTime: z.ZodOptional<z.ZodString>;
		endTime: z.ZodOptional<z.ZodString>;
		limit: z.ZodDefault<z.ZodNumber>;
	},
	'strip',
	z.ZodTypeAny,
	{
		limit: number;
		traceId?: string | undefined;
		startTime?: string | undefined;
		tags?: Record<string, string> | undefined;
		runId?: string | undefined;
		level?: 'error' | 'trace' | 'debug' | 'info' | 'warn' | 'fatal' | undefined;
		component?: string | undefined;
		traceContext?:
			| {
					runId: string;
					traceId?: string | undefined;
					spanId?: string | undefined;
					parentSpanId?: string | undefined;
			  }
			| undefined;
		endTime?: string | undefined;
		query?: string | undefined;
	},
	{
		traceId?: string | undefined;
		startTime?: string | undefined;
		tags?: Record<string, string> | undefined;
		runId?: string | undefined;
		level?: 'error' | 'trace' | 'debug' | 'info' | 'warn' | 'fatal' | undefined;
		component?: string | undefined;
		traceContext?:
			| {
					runId: string;
					traceId?: string | undefined;
					spanId?: string | undefined;
					parentSpanId?: string | undefined;
			  }
			| undefined;
		endTime?: string | undefined;
		limit?: number | undefined;
		query?: string | undefined;
	}
>;
export declare const EvaluateAlertInputSchema: z.ZodObject<
	{
		alertId: z.ZodString;
		metricWindow: z.ZodOptional<
			z.ZodObject<
				{
					metric: z.ZodOptional<z.ZodString>;
					aggregation: z.ZodOptional<z.ZodEnum<['sum', 'avg', 'count', 'max', 'min']>>;
					startTime: z.ZodOptional<z.ZodString>;
					endTime: z.ZodOptional<z.ZodString>;
				},
				'strip',
				z.ZodTypeAny,
				{
					startTime?: string | undefined;
					endTime?: string | undefined;
					aggregation?: 'min' | 'max' | 'sum' | 'avg' | 'count' | undefined;
					metric?: string | undefined;
				},
				{
					startTime?: string | undefined;
					endTime?: string | undefined;
					aggregation?: 'min' | 'max' | 'sum' | 'avg' | 'count' | undefined;
					metric?: string | undefined;
				}
			>
		>;
	},
	'strip',
	z.ZodTypeAny,
	{
		alertId: string;
		metricWindow?:
			| {
					startTime?: string | undefined;
					endTime?: string | undefined;
					aggregation?: 'min' | 'max' | 'sum' | 'avg' | 'count' | undefined;
					metric?: string | undefined;
			  }
			| undefined;
	},
	{
		alertId: string;
		metricWindow?:
			| {
					startTime?: string | undefined;
					endTime?: string | undefined;
					aggregation?: 'min' | 'max' | 'sum' | 'avg' | 'count' | undefined;
					metric?: string | undefined;
			  }
			| undefined;
	}
>;
export declare const GenerateDashboardInputSchema: z.ZodObject<
	{
		dashboardId: z.ZodString;
		include: z.ZodOptional<z.ZodArray<z.ZodEnum<['metrics', 'logs', 'traces', 'alerts']>, 'many'>>;
		timeRange: z.ZodOptional<
			z.ZodObject<
				{
					start: z.ZodOptional<z.ZodString>;
					end: z.ZodOptional<z.ZodString>;
				},
				'strip',
				z.ZodTypeAny,
				{
					start?: string | undefined;
					end?: string | undefined;
				},
				{
					start?: string | undefined;
					end?: string | undefined;
				}
			>
		>;
		limit: z.ZodDefault<z.ZodNumber>;
	},
	'strip',
	z.ZodTypeAny,
	{
		limit: number;
		dashboardId: string;
		include?: ('metrics' | 'logs' | 'traces' | 'alerts')[] | undefined;
		timeRange?:
			| {
					start?: string | undefined;
					end?: string | undefined;
			  }
			| undefined;
	},
	{
		dashboardId: string;
		limit?: number | undefined;
		include?: ('metrics' | 'logs' | 'traces' | 'alerts')[] | undefined;
		timeRange?:
			| {
					start?: string | undefined;
					end?: string | undefined;
			  }
			| undefined;
	}
>;
export interface ObservabilityTool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
}
export declare const observabilityMcpTools: ObservabilityTool[];
export type AggregationMode = (typeof aggregationModes)[number];
export type CreateTraceInput = z.infer<typeof CreateTraceInputSchema>;
export type RecordMetricInput = z.infer<typeof RecordMetricInputSchema>;
export type QueryTracesInput = z.infer<typeof QueryTracesInputSchema>;
export type GetMetricsInput = z.infer<typeof GetMetricsInputSchema>;
export type SearchLogsInput = z.infer<typeof SearchLogsInputSchema>;
export type EvaluateAlertInput = z.infer<typeof EvaluateAlertInputSchema>;
export type GenerateDashboardInput = z.infer<typeof GenerateDashboardInputSchema>;
export declare class ObservabilityToolError extends Error {
	readonly code: 'validation_error' | 'security_error' | 'internal_error';
	readonly details: string[];
	constructor(
		code: 'validation_error' | 'security_error' | 'internal_error',
		message: string,
		details?: string[],
	);
}
export declare function validateObservabilityToolInput(
	tool: ObservabilityTool['name'],
	input: unknown,
	options?: {
		correlationId?: string;
	},
):
	| {
			operationName: string;
			tags: Record<string, string> | undefined;
			startTime: string | undefined;
			traceId: string;
			service?: string | undefined;
	  }
	| {
			tags: Record<string, string> | undefined;
			timestamp: string | undefined;
			value: number;
			name: string;
			unit?: string | undefined;
	  }
	| {
			startTime: string | undefined;
			endTime: string | undefined;
			tags: Record<string, string> | undefined;
			limit: number;
			service?: string | undefined;
			status?: 'error' | 'success' | undefined;
			operation?: string | undefined;
	  }
	| {
			startTime: string | undefined;
			endTime: string | undefined;
			labels: Record<string, string> | undefined;
			limit: number;
			name?: string | undefined;
			aggregation?: 'min' | 'max' | 'sum' | 'avg' | 'count' | undefined;
	  }
	| {
			startTime: string | undefined;
			endTime: string | undefined;
			tags: Record<string, string> | undefined;
			limit: number;
			traceId?: string | undefined;
			runId?: string | undefined;
			level?: 'error' | 'trace' | 'debug' | 'info' | 'warn' | 'fatal' | undefined;
			component?: string | undefined;
			traceContext?:
				| {
						runId: string;
						traceId?: string | undefined;
						spanId?: string | undefined;
						parentSpanId?: string | undefined;
				  }
				| undefined;
			query?: string | undefined;
	  }
	| {
			metricWindow:
				| {
						startTime: string | undefined;
						endTime: string | undefined;
						aggregation?: 'min' | 'max' | 'sum' | 'avg' | 'count' | undefined;
						metric?: string | undefined;
				  }
				| undefined;
			alertId: string;
	  }
	| {
			timeRange:
				| {
						start: string | undefined;
						end: string | undefined;
				  }
				| undefined;
			limit: number;
			dashboardId: string;
			include?: ('metrics' | 'logs' | 'traces' | 'alerts')[] | undefined;
	  };
export declare function createObservabilityErrorResponse(
	tool: ObservabilityTool['name'],
	error: ObservabilityToolError,
	correlationId?: string,
): {
	isError: boolean;
	metadata: {
		tool: string;
		correlationId: string | undefined;
	};
	content: {
		type: string;
		text: string;
	}[];
};
//# sourceMappingURL=tools.d.ts.map
