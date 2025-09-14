import { z } from 'zod';

/**
 * Observability-related A2A event schemas for inter-package communication
 */

// Trace Created Event
export const TraceCreatedEventSchema = z.object({
	traceId: z.string(),
	operationName: z.string(),
	service: z.string(),
	startTime: z.string(),
	tags: z.record(z.string()).optional(),
});

// Metric Recorded Event
export const MetricRecordedEventSchema = z.object({
	name: z.string(),
	value: z.number(),
	type: z.enum(['counter', 'gauge', 'histogram', 'timer']),
	tags: z.record(z.string()).optional(),
	timestamp: z.string(),
});

// Trace Completed Event
export const TraceCompletedEventSchema = z.object({
	traceId: z.string(),
	duration: z.number().positive(),
	status: z.enum(['success', 'error']),
	completedAt: z.string(),
});

// Alert Triggered Event
export const AlertTriggeredEventSchema = z.object({
	alertId: z.string(),
	rule: z.string(),
	severity: z.enum(['low', 'medium', 'high', 'critical']),
	message: z.string(),
	triggeredAt: z.string(),
});

// Export event type definitions
export type TraceCreatedEvent = z.infer<typeof TraceCreatedEventSchema>;
export type MetricRecordedEvent = z.infer<typeof MetricRecordedEventSchema>;
export type TraceCompletedEvent = z.infer<typeof TraceCompletedEventSchema>;
export type AlertTriggeredEvent = z.infer<typeof AlertTriggeredEventSchema>;

// Helper function to create observability events
export const createObservabilityEvent = {
	traceCreated: (data: TraceCreatedEvent) => ({
		type: 'observability.trace.created' as const,
		data: TraceCreatedEventSchema.parse(data),
	}),
	metricRecorded: (data: MetricRecordedEvent) => ({
		type: 'observability.metric.recorded' as const,
		data: MetricRecordedEventSchema.parse(data),
	}),
	traceCompleted: (data: TraceCompletedEvent) => ({
		type: 'observability.trace.completed' as const,
		data: TraceCompletedEventSchema.parse(data),
	}),
	alertTriggered: (data: AlertTriggeredEvent) => ({
		type: 'observability.alert.triggered' as const,
		data: AlertTriggeredEventSchema.parse(data),
	}),
};
