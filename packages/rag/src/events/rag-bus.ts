import type { Envelope, TopicACL } from '@cortex-os/a2a-contracts';
import { createEnvelope } from '@cortex-os/a2a-contracts';
import type { BusOptions, Transport } from '@cortex-os/a2a-core';
import { createBus } from '@cortex-os/a2a-core';
import { inproc } from '@cortex-os/a2a-transport';
import {
	RAGEventSchemas,
	type RAGEventType,
	RAGEventTypes,
} from './rag-events';

// Type definitions for payload mapping
export type RagEventPayloadMap = {
	[RAGEventTypes.QueryExecuted]: {
		queryId: string;
		query: string;
		topK: number;
		timestamp: string;
		userId?: string;
	};
	[RAGEventTypes.QueryCompleted]: {
		queryId: string;
		results: Array<{
			text: string;
			score: number;
			metadata?: Record<string, unknown>;
		}>;
		provider: string;
		duration: number;
		timestamp: string;
	};
	[RAGEventTypes.IngestStarted]: {
		ingestId: string;
		contentLength: number;
		source?: string;
		chunkCount: number;
		timestamp: string;
	};
	[RAGEventTypes.IngestCompleted]: {
		ingestId: string;
		success: boolean;
		documentsProcessed: number;
		embeddings: number;
		duration: number;
		timestamp: string;
		error?: string;
	};
};

export type RagEventEnvelope<TType extends RAGEventType = RAGEventType> =
	Envelope & {
		type: TType;
		data: RagEventPayloadMap[TType];
	};

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
	const result: TopicACL = {};
	for (const [topic, permissions] of Object.entries(acl)) {
		const typedPerms = permissions as {
			publish?: boolean;
			subscribe?: boolean;
		};
		result[topic] = {
			publish: typedPerms.publish ?? false,
			subscribe: typedPerms.subscribe ?? false,
		};
	}
	return result;
}

function isRagEventType(type: string): type is RAGEventType {
	return type in RAGEventSchemas;
}

function validateEnvelope(envelope: Envelope): RagEventEnvelope {
	if (!isRagEventType(envelope.type)) {
		throw new Error(`Unsupported RAG event type: ${envelope.type}`);
	}
	const schema = (RAGEventSchemas as Record<string, import('zod').ZodTypeAny>)[
		envelope.type
	];
	const data = schema.parse(envelope.data);
	return { ...envelope, type: envelope.type as RAGEventType, data };
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
					handle: async (msg: Envelope) => {
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

export type { RAGEventTypes };
