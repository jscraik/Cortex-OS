import { createEnvelope } from '@cortex-os/a2a-contracts';
import { createBus } from '@cortex-os/a2a-core/bus';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import { ORCHESTRATION_EVENT_SCHEMAS, OrchestrationEventTypes } from './orchestration-events.js';

const DEFAULT_SOURCE = 'urn:cortex:orchestration';
const DEFAULT_TOPIC_ACL = Object.freeze(
	Object.fromEntries(
		Object.values(OrchestrationEventTypes).map((type) => [
			type,
			{ publish: true, subscribe: true },
		]),
	),
);
function cloneAcl(acl) {
	return Object.fromEntries(Object.entries(acl).map(([topic, rule]) => [topic, { ...rule }]));
}
function isOrchestrationEventType(type) {
	return type in ORCHESTRATION_EVENT_SCHEMAS;
}
function validateEnvelope(envelope) {
	if (!isOrchestrationEventType(envelope.type)) {
		throw new Error(`Unsupported orchestration event type: ${envelope.type}`);
	}
	const schema = ORCHESTRATION_EVENT_SCHEMAS[envelope.type];
	const data = schema.parse(envelope.data);
	const result = {
		id: envelope.id,
		type: envelope.type,
		source: envelope.source,
		specversion: envelope.specversion,
		datacontenttype: envelope.datacontenttype,
		dataschema: envelope.dataschema,
		subject: envelope.subject,
		time: envelope.time ?? new Date().toISOString(),
		causationId: envelope.causationId,
		correlationId: envelope.correlationId,
		ttlMs: envelope.ttlMs,
		headers: envelope.headers,
		traceparent: envelope.traceparent,
		tracestate: envelope.tracestate,
		baggage: envelope.baggage,
		data,
	};
	return result;
}
export function createOrchestrationBus(options = {}) {
	const transport = options.transport ?? inproc();
	const source = options.source ?? DEFAULT_SOURCE;
	const acl = cloneAcl(options.acl ?? DEFAULT_TOPIC_ACL);
	const bus = createBus(transport, validateEnvelope, undefined, acl, options.busOptions);
	return {
		async publish(type, payload, publishOptions) {
			if (!isOrchestrationEventType(type)) {
				throw new Error(`Unsupported orchestration event type: ${type}`);
			}
			const schema = ORCHESTRATION_EVENT_SCHEMAS[type];
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
			const unsubscribe = await bus.bind(
				handlers.map((handler) => ({
					type: handler.type,
					handle: async (msg) => {
						const validated = validateEnvelope(msg);
						await handler.handle(validated);
					},
				})),
			);
			return async () => {
				await unsubscribe();
			};
		},
	};
}
export { OrchestrationEventTypes };
//# sourceMappingURL=orchestration-bus.js.map
