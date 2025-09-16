import { z } from 'zod';

/**
 * Observability-related A2A event schemas for inter-package communication
 */

export const OBSERVABILITY_EVENT_TYPES = {
        TRACE_CREATED: 'observability.trace.created',
        METRIC_RECORDED: 'observability.metric.recorded',
        TRACE_COMPLETED: 'observability.trace.completed',
        ALERT_TRIGGERED: 'observability.alert.triggered',
} as const;

export type ObservabilityEventType =
        (typeof OBSERVABILITY_EVENT_TYPES)[keyof typeof OBSERVABILITY_EVENT_TYPES];

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

export const OBSERVABILITY_EVENT_SCHEMAS = {
        [OBSERVABILITY_EVENT_TYPES.TRACE_CREATED]: TraceCreatedEventSchema,
        [OBSERVABILITY_EVENT_TYPES.METRIC_RECORDED]: MetricRecordedEventSchema,
        [OBSERVABILITY_EVENT_TYPES.TRACE_COMPLETED]: TraceCompletedEventSchema,
        [OBSERVABILITY_EVENT_TYPES.ALERT_TRIGGERED]: AlertTriggeredEventSchema,
} as const;

export type TraceCreatedEvent = z.infer<typeof TraceCreatedEventSchema>;
export type MetricRecordedEvent = z.infer<typeof MetricRecordedEventSchema>;
export type TraceCompletedEvent = z.infer<typeof TraceCompletedEventSchema>;
export type AlertTriggeredEvent = z.infer<typeof AlertTriggeredEventSchema>;

type FactoryResult<TType extends ObservabilityEventType> = {
        type: TType;
        data: z.infer<(typeof OBSERVABILITY_EVENT_SCHEMAS)[TType]>;
};

// Helper function to create observability events
export const createObservabilityEvent = {
        traceCreated: (data: TraceCreatedEvent): FactoryResult<typeof OBSERVABILITY_EVENT_TYPES.TRACE_CREATED> => ({
                type: OBSERVABILITY_EVENT_TYPES.TRACE_CREATED,
                data: TraceCreatedEventSchema.parse(data),
        }),
        metricRecorded: (
                data: MetricRecordedEvent,
        ): FactoryResult<typeof OBSERVABILITY_EVENT_TYPES.METRIC_RECORDED> => ({
                type: OBSERVABILITY_EVENT_TYPES.METRIC_RECORDED,
                data: MetricRecordedEventSchema.parse(data),
        }),
        traceCompleted: (
                data: TraceCompletedEvent,
        ): FactoryResult<typeof OBSERVABILITY_EVENT_TYPES.TRACE_COMPLETED> => ({
                type: OBSERVABILITY_EVENT_TYPES.TRACE_COMPLETED,
                data: TraceCompletedEventSchema.parse(data),
        }),
        alertTriggered: (
                data: AlertTriggeredEvent,
        ): FactoryResult<typeof OBSERVABILITY_EVENT_TYPES.ALERT_TRIGGERED> => ({
                type: OBSERVABILITY_EVENT_TYPES.ALERT_TRIGGERED,
                data: AlertTriggeredEventSchema.parse(data),
        }),
};
