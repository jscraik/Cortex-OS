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
	RAGEventSchemas,
	type RAGEventType,
	RAGEventTypes,
	type RAGIngestCompleteEvent,
	type RAGIngestEvent,
	type RAGQueryEvent,
	type RAGQueryResultEvent,
} from './rag-events.js';

type RagEventPayloadMap = {
	[RAGEventTypes.QueryExecuted]: RAGQueryEvent;
	[RAGEventTypes.QueryCompleted]: RAGQueryResultEvent;
	[RAGEventTypes.IngestStarted]: RAGIngestEvent;
	[RAGEventTypes.IngestCompleted]: RAGIngestCompleteEvent;
};

export type RagEventEnvelope<TType extends RAGEventType = RAGEventType> =
	Envelope & { type: TType; data: RagEventPayloadMap[TType] };

export type RagEventHandler<TType extends RAGEventType = RAGEventType> = {
	type: TType;
	handle: (event: RagEventEnvelope<TType>) => Promise<void> | void;
};

export interface RagPublishOptions {
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

export interface RagBusOptions {
	transport?: Transport;
	source?: string;
	acl?: TopicACL;
	busOptions?: BusOptions;
}

export interface RagBus {
	publish<TType extends RAGEventType>(
		type: TType,
		payload: RagEventPayloadMap[TType],
		options?: RagPublishOptions,
	): Promise<void>;
	publishEnvelope(envelope: RagEventEnvelope): Promise<void>;
	bind(handlers: RagEventHandler[]): Promise<() => Promise<void>>;
}

const DEFAULT_SOURCE = 'urn:cortex:rag';

const DEFAULT_TOPIC_ACL: TopicACL = Object.freeze(
	Object.fromEntries(
		Object.values(RAGEventTypes).map((type) => [
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

function isRagEventType(type: string): type is RAGEventType {
	return type in RAGEventSchemas;
}

function validateEnvelope(envelope: Envelope): RagEventEnvelope {
	if (!isRagEventType(envelope.type)) {
		throw new Error(`Unsupported RAG event type: ${envelope.type}`);
	}
	const schema = RAGEventSchemas[envelope.type];
	const data = schema.parse(envelope.data);
	return { ...envelope, data };
}

export function createRagBus(options: RagBusOptions = {}): RagBus {
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
		async publish<TType extends RAGEventType>(
			type: TType,
			payload: RagEventPayloadMap[TType],
			publishOptions?: RagPublishOptions,
		) {
			if (!isRagEventType(type)) {
				throw new Error(`Unsupported RAG event type: ${type}`);
			}
			const schema = RAGEventSchemas[type];
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
			}) as RagEventEnvelope<TType>;
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
						await handler.handle(validated as RagEventEnvelope);
					},
				})),
			);
			return async () => {
				await unsubscribe();
			};
		},
	};
}

export { RAGEventTypes };
