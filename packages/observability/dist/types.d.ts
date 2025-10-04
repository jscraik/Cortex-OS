/**
 * @fileoverview Observability types and interfaces
 */
import { z } from 'zod';
export declare const ULIDSchema: z.ZodString;
export type ULID = z.infer<typeof ULIDSchema>;
export declare const TraceContextSchema: z.ZodObject<
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
>;
export type TraceContext = z.infer<typeof TraceContextSchema>;
export declare const MetricLabelsSchema: z.ZodRecord<z.ZodString, z.ZodString>;
export type MetricLabels = z.infer<typeof MetricLabelsSchema>;
export declare const LogLevelSchema: z.ZodEnum<
	['trace', 'debug', 'info', 'warn', 'error', 'fatal']
>;
export type LogLevel = z.infer<typeof LogLevelSchema>;
export declare const LogEntrySchema: z.ZodObject<
	{
		runId: z.ZodString;
		level: z.ZodEnum<['trace', 'debug', 'info', 'warn', 'error', 'fatal']>;
		message: z.ZodString;
		timestamp: z.ZodString;
		component: z.ZodString;
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
		extra: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
	},
	'strip',
	z.ZodTypeAny,
	{
		message: string;
		timestamp: string;
		runId: string;
		level: 'error' | 'trace' | 'debug' | 'info' | 'warn' | 'fatal';
		component: string;
		traceContext?:
			| {
					runId: string;
					traceId?: string | undefined;
					spanId?: string | undefined;
					parentSpanId?: string | undefined;
			  }
			| undefined;
		extra?: Record<string, unknown> | undefined;
	},
	{
		message: string;
		timestamp: string;
		runId: string;
		level: 'error' | 'trace' | 'debug' | 'info' | 'warn' | 'fatal';
		component: string;
		traceContext?:
			| {
					runId: string;
					traceId?: string | undefined;
					spanId?: string | undefined;
					parentSpanId?: string | undefined;
			  }
			| undefined;
		extra?: Record<string, unknown> | undefined;
	}
>;
export type LogEntry = z.infer<typeof LogEntrySchema>;
export declare const ErrorBudgetSchema: z.ZodObject<
	{
		slo: z.ZodNumber;
		actual: z.ZodNumber;
		budget: z.ZodNumber;
		burnRate: z.ZodNumber;
		window: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		slo: number;
		actual: number;
		budget: number;
		burnRate: number;
		window: string;
	},
	{
		slo: number;
		actual: number;
		budget: number;
		burnRate: number;
		window: string;
	}
>;
export type ErrorBudget = z.infer<typeof ErrorBudgetSchema>;
//# sourceMappingURL=types.d.ts.map
