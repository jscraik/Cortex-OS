/**
 * @fileoverview Observability types and interfaces
 */
import { z } from 'zod';
// ULID schema
export const ULIDSchema = z
	.string()
	.regex(/^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/);
// Trace context
export const TraceContextSchema = z.object({
	runId: ULIDSchema,
	traceId: z.string().optional(),
	spanId: z.string().optional(),
	parentSpanId: z.string().optional(),
});
// Metric labels
export const MetricLabelsSchema = z.record(z.string(), z.string());
// Log levels
export const LogLevelSchema = z.enum([
	'trace',
	'debug',
	'info',
	'warn',
	'error',
	'fatal',
]);
// Structured log entry
export const LogEntrySchema = z.object({
	runId: ULIDSchema,
	level: LogLevelSchema,
	message: z.string(),
	timestamp: z.string(),
	component: z.string(),
	traceContext: TraceContextSchema.optional(),
	extra: z.record(z.string(), z.unknown()).optional(),
});
// Error budget
export const ErrorBudgetSchema = z.object({
	slo: z.number().min(0).max(1), // e.g., 0.99 for 99%
	actual: z.number().min(0).max(1),
	budget: z.number(), // remaining error budget
	burnRate: z.number(), // current burn rate
	window: z.string(), // time window (e.g., "30d")
});
//# sourceMappingURL=types.js.map
