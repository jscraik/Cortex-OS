import {
	createEnvelope,
	type Envelope,
	type TopicACL,
} from '@cortex-os/a2a-contracts';
import {
	type BusOptions,
	createBus,
	type Transport,
} from '@cortex-os/a2a-core/bus';
import { inproc } from '@cortex-os/a2a-transport/inproc';

import {
	type AlertTriggeredEvent,
	type MetricRecordedEvent,
	OBSERVABILITY_EVENT_SCHEMAS,
	OBSERVABILITY_EVENT_TYPES,
	type ObservabilityEventType,
	type TraceCompletedEvent,
	type TraceCreatedEvent,
} from './observability-events.js';

type ObservabilityEventPayloadMap = {
	[OBSERVABILITY_EVENT_TYPES.TRACE_CREATED]: TraceCreatedEvent;
	[OBSERVABILITY_EVENT_TYPES.METRIC_RECORDED]: MetricRecordedEvent;
	[OBSERVABILITY_EVENT_TYPES.TRACE_COMPLETED]: TraceCompletedEvent;
	[OBSERVABILITY_EVENT_TYPES.ALERT_TRIGGERED]: AlertTriggeredEvent;
};

export type ObservabilityEventEnvelope<
	TType extends ObservabilityEventType = ObservabilityEventType,
> = Envelope & { type: TType; data: ObservabilityEventPayloadMap[TType] };

export type ObservabilityEventHandler<
	TType extends ObservabilityEventType = ObservabilityEventType,
> = {
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
	publish<TType extends ObservabilityEventType>(
		type: TType,
		payload: ObservabilityEventPayloadMap[TType],
		options?: ObservabilityPublishOptions,
	): Promise<void>;
	publishEnvelope(envelope: ObservabilityEventEnvelope): Promise<void>;
	bind(handlers: ObservabilityEventHandler[]): Promise<() => Promise<void>>;
}

const DEFAULT_SOURCE = 'urn:cortex:observability';

const DEFAULT_TOPIC_ACL: TopicACL = Object.freeze(
	Object.fromEntries(
		Object.values(OBSERVABILITY_EVENT_TYPES).map((type) => [
			type,
			{ publish: true, subscribe: true },
		]),
	),
) as TopicACL;

function cloneAcl(acl: TopicACL): TopicACL {
	return Object.fromEntries(
		Object.entries(acl).map(([topic, rule]) => [topic, { ...rule }]),
	);
}

function isObservabilityEventType(
	type: string,
): type is ObservabilityEventType {
	return type in OBSERVABILITY_EVENT_SCHEMAS;
}

function validateEnvelope(envelope: Envelope): ObservabilityEventEnvelope {
	if (!isObservabilityEventType(envelope.type)) {
		throw new Error(`Unsupported observability event type: ${envelope.type}`);
	}
	const schema = OBSERVABILITY_EVENT_SCHEMAS[envelope.type];
	const data = schema.parse(envelope.data);
	return { ...envelope, data } as ObservabilityEventEnvelope;
}

export function createObservabilityBus(
	options: ObservabilityBusOptions = {},
): ObservabilityBus {
	const transport = options.transport ?? inproc();
	const source = options.source ?? DEFAULT_SOURCE;
	const acl = cloneAcl(options.acl ?? DEFAULT_TOPIC_ACL);

	const bus = createBus(
		transport,
		validateEnvelope,
		undefined,
		acl,
		options.busOptions,
	);

	return {
		async publish<TType extends ObservabilityEventType>(
			type: TType,
			payload: ObservabilityEventPayloadMap[TType],
			publishOptions?: ObservabilityPublishOptions,
		) {
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
			}) as ObservabilityEventEnvelope<TType>;
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
						await handler.handle(validated as ObservabilityEventEnvelope);
					},
				})),
			);
			return async () => {
				await unsubscribe();
			};
		},
	};
}

export { OBSERVABILITY_EVENT_TYPES };
