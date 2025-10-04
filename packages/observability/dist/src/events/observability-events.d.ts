import { z } from 'zod';
/**
 * Observability-related A2A event schemas for inter-package communication
 */
export declare const OBSERVABILITY_EVENT_TYPES: {
    readonly TRACE_CREATED: "observability.trace.created";
    readonly METRIC_RECORDED: "observability.metric.recorded";
    readonly TRACE_COMPLETED: "observability.trace.completed";
    readonly ALERT_TRIGGERED: "observability.alert.triggered";
};
export type ObservabilityEventType = (typeof OBSERVABILITY_EVENT_TYPES)[keyof typeof OBSERVABILITY_EVENT_TYPES];
export declare const TraceCreatedEventSchema: z.ZodObject<{
    traceId: z.ZodString;
    operationName: z.ZodString;
    service: z.ZodString;
    startTime: z.ZodString;
    tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    traceId: string;
    operationName: string;
    service: string;
    startTime: string;
    tags?: Record<string, string> | undefined;
}, {
    traceId: string;
    operationName: string;
    service: string;
    startTime: string;
    tags?: Record<string, string> | undefined;
}>;
export declare const MetricRecordedEventSchema: z.ZodObject<{
    name: z.ZodString;
    value: z.ZodNumber;
    type: z.ZodEnum<["counter", "gauge", "histogram", "timer"]>;
    tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: number;
    type: "counter" | "gauge" | "histogram" | "timer";
    name: string;
    timestamp: string;
    tags?: Record<string, string> | undefined;
}, {
    value: number;
    type: "counter" | "gauge" | "histogram" | "timer";
    name: string;
    timestamp: string;
    tags?: Record<string, string> | undefined;
}>;
export declare const TraceCompletedEventSchema: z.ZodObject<{
    traceId: z.ZodString;
    duration: z.ZodNumber;
    status: z.ZodEnum<["success", "error"]>;
    completedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    traceId: string;
    status: "error" | "success";
    duration: number;
    completedAt: string;
}, {
    traceId: string;
    status: "error" | "success";
    duration: number;
    completedAt: string;
}>;
export declare const AlertTriggeredEventSchema: z.ZodObject<{
    alertId: z.ZodString;
    rule: z.ZodString;
    severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
    message: z.ZodString;
    triggeredAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    alertId: string;
    rule: string;
    severity: "low" | "medium" | "high" | "critical";
    triggeredAt: string;
}, {
    message: string;
    alertId: string;
    rule: string;
    severity: "low" | "medium" | "high" | "critical";
    triggeredAt: string;
}>;
export declare const OBSERVABILITY_EVENT_SCHEMAS: {
    readonly "observability.trace.created": z.ZodObject<{
        traceId: z.ZodString;
        operationName: z.ZodString;
        service: z.ZodString;
        startTime: z.ZodString;
        tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        traceId: string;
        operationName: string;
        service: string;
        startTime: string;
        tags?: Record<string, string> | undefined;
    }, {
        traceId: string;
        operationName: string;
        service: string;
        startTime: string;
        tags?: Record<string, string> | undefined;
    }>;
    readonly "observability.metric.recorded": z.ZodObject<{
        name: z.ZodString;
        value: z.ZodNumber;
        type: z.ZodEnum<["counter", "gauge", "histogram", "timer"]>;
        tags: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: number;
        type: "counter" | "gauge" | "histogram" | "timer";
        name: string;
        timestamp: string;
        tags?: Record<string, string> | undefined;
    }, {
        value: number;
        type: "counter" | "gauge" | "histogram" | "timer";
        name: string;
        timestamp: string;
        tags?: Record<string, string> | undefined;
    }>;
    readonly "observability.trace.completed": z.ZodObject<{
        traceId: z.ZodString;
        duration: z.ZodNumber;
        status: z.ZodEnum<["success", "error"]>;
        completedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        traceId: string;
        status: "error" | "success";
        duration: number;
        completedAt: string;
    }, {
        traceId: string;
        status: "error" | "success";
        duration: number;
        completedAt: string;
    }>;
    readonly "observability.alert.triggered": z.ZodObject<{
        alertId: z.ZodString;
        rule: z.ZodString;
        severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
        message: z.ZodString;
        triggeredAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: string;
        alertId: string;
        rule: string;
        severity: "low" | "medium" | "high" | "critical";
        triggeredAt: string;
    }, {
        message: string;
        alertId: string;
        rule: string;
        severity: "low" | "medium" | "high" | "critical";
        triggeredAt: string;
    }>;
};
export type TraceCreatedEvent = z.infer<typeof TraceCreatedEventSchema>;
export type MetricRecordedEvent = z.infer<typeof MetricRecordedEventSchema>;
export type TraceCompletedEvent = z.infer<typeof TraceCompletedEventSchema>;
export type AlertTriggeredEvent = z.infer<typeof AlertTriggeredEventSchema>;
type FactoryResult<TType extends ObservabilityEventType> = {
    type: TType;
    data: z.infer<(typeof OBSERVABILITY_EVENT_SCHEMAS)[TType]>;
};
export declare const createObservabilityEvent: {
    traceCreated: (data: TraceCreatedEvent) => FactoryResult<typeof OBSERVABILITY_EVENT_TYPES.TRACE_CREATED>;
    metricRecorded: (data: MetricRecordedEvent) => FactoryResult<typeof OBSERVABILITY_EVENT_TYPES.METRIC_RECORDED>;
    traceCompleted: (data: TraceCompletedEvent) => FactoryResult<typeof OBSERVABILITY_EVENT_TYPES.TRACE_COMPLETED>;
    alertTriggered: (data: AlertTriggeredEvent) => FactoryResult<typeof OBSERVABILITY_EVENT_TYPES.ALERT_TRIGGERED>;
};
export {};
//# sourceMappingURL=observability-events.d.ts.map