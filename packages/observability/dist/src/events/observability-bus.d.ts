import { type Envelope, type TopicACL } from '@cortex-os/a2a-contracts';
import { type BusOptions } from '@cortex-os/a2a-core/bus';
import type { Transport } from '@cortex-os/a2a-core/transport';
import { type AlertTriggeredEvent, type MetricRecordedEvent, OBSERVABILITY_EVENT_TYPES, type ObservabilityEventType, type TraceCompletedEvent, type TraceCreatedEvent } from './observability-events.js';
type ObservabilityEventPayloadMap = {
    [OBSERVABILITY_EVENT_TYPES.TRACE_CREATED]: TraceCreatedEvent;
    [OBSERVABILITY_EVENT_TYPES.METRIC_RECORDED]: MetricRecordedEvent;
    [OBSERVABILITY_EVENT_TYPES.TRACE_COMPLETED]: TraceCompletedEvent;
    [OBSERVABILITY_EVENT_TYPES.ALERT_TRIGGERED]: AlertTriggeredEvent;
};
export type ObservabilityEventEnvelope<TType extends ObservabilityEventType = ObservabilityEventType> = Envelope & {
    type: TType;
    data: ObservabilityEventPayloadMap[TType];
};
export type ObservabilityEventHandler<TType extends ObservabilityEventType = ObservabilityEventType> = {
    type: TType;
    handle: (event: ObservabilityEventEnvelope<TType>) => Promise<void> | void;
};
export interface ObservabilityPublishOptions {
    subject?: string;
    correlationId?: string;
    causationId?: string;
    ttlMs?: number;
    headers?: Record<string, string>;
    datacontenttype?: string;
    dataschema?: string;
    traceparent?: string;
    tracestate?: string;
    baggage?: string;
}
export interface ObservabilityBusOptions {
    transport?: Transport;
    source?: string;
    acl?: TopicACL;
    busOptions?: BusOptions;
}
export interface ObservabilityBus {
    publish<TType extends ObservabilityEventType>(type: TType, payload: ObservabilityEventPayloadMap[TType], options?: ObservabilityPublishOptions): Promise<void>;
    publishEnvelope(envelope: ObservabilityEventEnvelope): Promise<void>;
    bind(handlers: ObservabilityEventHandler[]): Promise<() => Promise<void>>;
}
export declare function createObservabilityBus(options?: ObservabilityBusOptions): ObservabilityBus;
export { OBSERVABILITY_EVENT_TYPES };
//# sourceMappingURL=observability-bus.d.ts.map