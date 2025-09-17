import { z } from 'zod';
/**
 * Observability-related A2A event schemas for inter-package communication
 */
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
    timestamp: string;
    name: string;
    tags?: Record<string, string> | undefined;
}, {
    value: number;
    type: "counter" | "gauge" | "histogram" | "timer";
    timestamp: string;
    name: string;
    tags?: Record<string, string> | undefined;
}>;
export declare const TraceCompletedEventSchema: z.ZodObject<{
    traceId: z.ZodString;
    duration: z.ZodNumber;
    status: z.ZodEnum<["success", "error"]>;
    completedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "error" | "success";
    duration: number;
    completedAt: string;
    traceId: string;
}, {
    status: "error" | "success";
    duration: number;
    completedAt: string;
    traceId: string;
}>;
export declare const AlertTriggeredEventSchema: z.ZodObject<{
    alertId: z.ZodString;
    rule: z.ZodString;
    severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
    message: z.ZodString;
    triggeredAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    severity: "low" | "medium" | "high" | "critical";
    rule: string;
    alertId: string;
    triggeredAt: string;
}, {
    message: string;
    severity: "low" | "medium" | "high" | "critical";
    rule: string;
    alertId: string;
    triggeredAt: string;
}>;
export type TraceCreatedEvent = z.infer<typeof TraceCreatedEventSchema>;
export type MetricRecordedEvent = z.infer<typeof MetricRecordedEventSchema>;
export type TraceCompletedEvent = z.infer<typeof TraceCompletedEventSchema>;
export type AlertTriggeredEvent = z.infer<typeof AlertTriggeredEventSchema>;
export declare const createObservabilityEvent: {
    traceCreated: (data: TraceCreatedEvent) => {
        type: "observability.trace.created";
        data: {
            traceId: string;
            operationName: string;
            service: string;
            startTime: string;
            tags?: Record<string, string> | undefined;
        };
    };
    metricRecorded: (data: MetricRecordedEvent) => {
        type: "observability.metric.recorded";
        data: {
            value: number;
            type: "counter" | "gauge" | "histogram" | "timer";
            timestamp: string;
            name: string;
            tags?: Record<string, string> | undefined;
        };
    };
    traceCompleted: (data: TraceCompletedEvent) => {
        type: "observability.trace.completed";
        data: {
            status: "error" | "success";
            duration: number;
            completedAt: string;
            traceId: string;
        };
    };
    alertTriggered: (data: AlertTriggeredEvent) => {
        type: "observability.alert.triggered";
        data: {
            message: string;
            severity: "low" | "medium" | "high" | "critical";
            rule: string;
            alertId: string;
            triggeredAt: string;
        };
    };
};
//# sourceMappingURL=observability-events.d.ts.map