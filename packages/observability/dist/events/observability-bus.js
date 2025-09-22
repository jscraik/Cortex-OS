import { createEnvelope } from '@cortex-os/a2a-contracts';
import { createBus } from '@cortex-os/a2a-core/bus';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import { OBSERVABILITY_EVENT_SCHEMAS, OBSERVABILITY_EVENT_TYPES, } from './observability-events.js';
const DEFAULT_SOURCE = 'urn:cortex:observability';
const DEFAULT_TOPIC_ACL = Object.freeze(Object.fromEntries(Object.values(OBSERVABILITY_EVENT_TYPES).map((type) => [
    type,
    { publish: true, subscribe: true },
])));
function cloneAcl(acl) {
    return Object.fromEntries(Object.entries(acl).map(([topic, rule]) => [topic, { ...rule }]));
}
function isObservabilityEventType(type) {
    return type in OBSERVABILITY_EVENT_SCHEMAS;
}
function validateEnvelope(envelope) {
    if (!isObservabilityEventType(envelope.type)) {
        throw new Error(`Unsupported observability event type: ${envelope.type}`);
    }
    const schema = OBSERVABILITY_EVENT_SCHEMAS[envelope.type];
    const data = schema.parse(envelope.data);
    return { ...envelope, data };
}
export function createObservabilityBus(options = {}) {
    const transport = options.transport ?? inproc();
    const source = options.source ?? DEFAULT_SOURCE;
    const acl = cloneAcl(options.acl ?? DEFAULT_TOPIC_ACL);
    const bus = createBus(transport, validateEnvelope, undefined, acl, options.busOptions);
    return {
        async publish(type, payload, publishOptions) {
            if (!isObservabilityEventType(type)) {
                throw new Error(`Unsupported observability event type: ${type}`);
            }
            const schema = OBSERVABILITY_EVENT_SCHEMAS[type];
            const data = schema.parse(payload);
            const envelope = createEnvelope({
                type,
                source,
                data,
                subject: publishOptions?.subject,
                correlationId: publishOptions?.correlationId,
                causationId: publishOptions?.causationId,
                ttlMs: publishOptions?.ttlMs,
                headers: publishOptions?.headers,
                datacontenttype: publishOptions?.datacontenttype ?? 'application/json',
                dataschema: publishOptions?.dataschema,
                traceparent: publishOptions?.traceparent,
                tracestate: publishOptions?.tracestate,
                baggage: publishOptions?.baggage,
            });
            await bus.publish(envelope);
        },
        async publishEnvelope(envelope) {
            const validated = validateEnvelope(envelope);
            await bus.publish(validated);
        },
        async bind(handlers) {
            const unsubscribe = await bus.bind(handlers.map((handler) => ({
                type: handler.type,
                handle: async (msg) => {
                    const validated = validateEnvelope(msg);
                    await handler.handle(validated);
                },
            })));
            return async () => {
                await unsubscribe();
            };
        },
    };
}
export { OBSERVABILITY_EVENT_TYPES };
//# sourceMappingURL=observability-bus.js.map