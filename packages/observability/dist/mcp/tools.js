import { z } from 'zod';
import { createLogger } from '../logging/index.js';
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
const aggregationModes = ['sum', 'avg', 'count', 'max', 'min'];
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
export const observabilityMcpTools = [
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
		description: 'Generate observability dashboards with metrics, logs, and traces',
		inputSchema: GenerateDashboardInputSchema,
	},
];
// -----------------------------
// Validation utilities & errors
// -----------------------------
export class ObservabilityToolError extends Error {
	code;
	details;
	constructor(code, message, details = []) {
		super(message);
		this.code = code;
		this.details = details;
		this.name = 'ObservabilityToolError';
	}
}
const logger = createLogger('observability-mcp-tools', 'debug');
function toIsoOrUndefined(value) {
	if (!value) return undefined;
	const ts = Date.parse(value);
	if (Number.isNaN(ts)) return undefined;
	return new Date(ts).toISOString();
}
function assertSafeRecord(obj, context) {
	if (obj == null || typeof obj !== 'object') return;
	const proto = Object.getPrototypeOf(obj);
	// Only allow plain objects or null-prototype objects
	if (proto !== Object.prototype && proto !== null) {
		throw new ObservabilityToolError('security_error', `Unsafe object prototype for ${context}`, [
			`${context}: unsafe prototype`,
		]);
	}
	for (const key in obj) {
		if (!Object.hasOwn?.(obj, key)) {
			throw new ObservabilityToolError(
				'security_error',
				`Unexpected inherited property in ${context}`,
				[`${context}: inherited property`],
			);
		}
		if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
			throw new ObservabilityToolError('security_error', `Illegal key in ${context}`, [
				`${context}: illegal key ${key}`,
			]);
		}
	}
}
function sanitizeStringMap(map) {
	if (!map) return undefined;
	assertSafeRecord(map, 'tags');
	const out = {};
	for (const [k, v] of Object.entries(map)) {
		const key = k.trim();
		const val = typeof v === 'string' ? v.trim() : String(v);
		out[key] = val;
	}
	return out;
}
function ensureTimeRange(start, end) {
	if (start && end) {
		const s = Date.parse(start);
		const e = Date.parse(end);
		if (!Number.isNaN(s) && !Number.isNaN(e) && s > e) {
			throw new ObservabilityToolError(
				'validation_error',
				'Invalid time range: startTime must be before endTime',
				['startTime must be <= endTime'],
			);
		}
	}
}
function validateTraceId(traceId) {
	// W3C trace id: 32 hex chars
	if (!/^[0-9a-fA-F]{32}$/.test(traceId)) {
		throw new ObservabilityToolError('validation_error', 'Invalid traceId format', [
			'traceId: must be 32 hex characters',
		]);
	}
}
export function validateObservabilityToolInput(tool, input, options) {
	try {
		switch (tool) {
			case 'create_trace': {
				// Pre-parse security check on raw tags
				const raw = input;
				if (raw && raw.tags !== undefined) {
					assertSafeRecord(raw.tags, 'tags');
				}
				const parsed = CreateTraceInputSchema.parse(input);
				validateTraceId(parsed.traceId);
				const sanitized = {
					...parsed,
					operationName: parsed.operationName.trim(),
					tags: sanitizeStringMap(parsed.tags),
					startTime: toIsoOrUndefined(parsed.startTime),
				};
				logger.debug(
					{ tool, correlationId: options?.correlationId },
					'validated observability tool input',
				);
				return sanitized;
			}
			case 'record_metric': {
				// Pre-parse security check on raw tags
				const raw = input;
				if (raw && raw.tags !== undefined) {
					assertSafeRecord(raw.tags, 'tags');
				}
				const parsed = RecordMetricInputSchema.parse(input);
				const sanitized = {
					...parsed,
					tags: sanitizeStringMap(parsed.tags),
					timestamp: toIsoOrUndefined(parsed.timestamp),
				};
				logger.debug(
					{ tool, correlationId: options?.correlationId },
					'validated observability tool input',
				);
				return sanitized;
			}
			case 'query_traces': {
				const parsed = QueryTracesInputSchema.parse(input);
				ensureTimeRange(parsed.startTime, parsed.endTime);
				const sanitized = {
					...parsed,
					startTime: toIsoOrUndefined(parsed.startTime),
					endTime: toIsoOrUndefined(parsed.endTime),
					tags: sanitizeStringMap(parsed.tags),
				};
				logger.debug(
					{ tool, correlationId: options?.correlationId },
					'validated observability tool input',
				);
				return sanitized;
			}
			case 'get_metrics': {
				// Pre-parse security check on raw labels
				const raw = input;
				if (raw && raw.labels !== undefined) {
					assertSafeRecord(raw.labels, 'labels');
				}
				const parsed = GetMetricsInputSchema.parse(input);
				ensureTimeRange(parsed.startTime, parsed.endTime);
				const sanitized = {
					...parsed,
					startTime: toIsoOrUndefined(parsed.startTime),
					endTime: toIsoOrUndefined(parsed.endTime),
					labels: sanitizeStringMap(parsed.labels),
				};
				logger.debug(
					{ tool, correlationId: options?.correlationId },
					'validated observability tool input',
				);
				return sanitized;
			}
			case 'search_logs': {
				// Pre-parse security check on raw tags
				const raw = input;
				if (raw && raw.tags !== undefined) {
					assertSafeRecord(raw.tags, 'tags');
				}
				const parsed = SearchLogsInputSchema.parse(input);
				ensureTimeRange(parsed.startTime, parsed.endTime);
				const sanitized = {
					...parsed,
					startTime: toIsoOrUndefined(parsed.startTime),
					endTime: toIsoOrUndefined(parsed.endTime),
					tags: sanitizeStringMap(parsed.tags),
				};
				logger.debug(
					{ tool, correlationId: options?.correlationId },
					'validated observability tool input',
				);
				return sanitized;
			}
			case 'evaluate_alert': {
				const parsed = EvaluateAlertInputSchema.parse(input);
				const sanitized = {
					...parsed,
					metricWindow: parsed.metricWindow
						? {
								...parsed.metricWindow,
								startTime: toIsoOrUndefined(parsed.metricWindow.startTime),
								endTime: toIsoOrUndefined(parsed.metricWindow.endTime),
							}
						: undefined,
				};
				if (sanitized.metricWindow) {
					ensureTimeRange(sanitized.metricWindow.startTime, sanitized.metricWindow.endTime);
				}
				logger.debug(
					{ tool, correlationId: options?.correlationId },
					'validated observability tool input',
				);
				return sanitized;
			}
			case 'generate_dashboard': {
				const parsed = GenerateDashboardInputSchema.parse(input);
				const sanitized = {
					...parsed,
					timeRange: parsed.timeRange
						? {
								start: toIsoOrUndefined(parsed.timeRange.start),
								end: toIsoOrUndefined(parsed.timeRange.end),
							}
						: undefined,
				};
				if (sanitized.timeRange) {
					ensureTimeRange(sanitized.timeRange.start, sanitized.timeRange.end);
				}
				logger.debug(
					{ tool, correlationId: options?.correlationId },
					'validated observability tool input',
				);
				return sanitized;
			}
			default:
				throw new ObservabilityToolError('validation_error', `Unknown tool: ${tool}`);
		}
	} catch (err) {
		const ote =
			err instanceof ObservabilityToolError
				? err
				: new ObservabilityToolError('validation_error', err.message ?? 'validation failed');
		logger.warn({ tool, correlationId: options?.correlationId }, `${tool} validation failed`);
		throw ote;
	}
}
export function createObservabilityErrorResponse(tool, error, correlationId) {
	logger.warn({ tool, correlationId }, `${tool} validation failed`);
	const payload = {
		success: false,
		error: {
			code: error.code,
			message: error.message,
			details: error.details,
		},
		correlationId,
		timestamp: new Date().toISOString(),
	};
	return {
		isError: true,
		metadata: { tool, correlationId },
		content: [
			{
				type: 'text',
				text: JSON.stringify(payload),
			},
		],
	};
}
//# sourceMappingURL=tools.js.map
