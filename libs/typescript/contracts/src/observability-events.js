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
// Helper function to create observability events
export const createObservabilityEvent = {
    traceCreated: (data) => ({
        type: 'observability.trace.created',
        data: TraceCreatedEventSchema.parse(data),
    }),
    metricRecorded: (data) => ({
        type: 'observability.metric.recorded',
        data: MetricRecordedEventSchema.parse(data),
    }),
    traceCompleted: (data) => ({
        type: 'observability.trace.completed',
        data: TraceCompletedEventSchema.parse(data),
    }),
    alertTriggered: (data) => ({
        type: 'observability.alert.triggered',
        data: AlertTriggeredEventSchema.parse(data),
    }),
};
//# sourceMappingURL=observability-events.js.map