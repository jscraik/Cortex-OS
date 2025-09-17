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
	type AgentAssignedEvent,
	type AgentFreedEvent,
	type CoordinationStartedEvent,
	type DecisionMadeEvent,
	ORCHESTRATION_EVENT_SCHEMAS,
	type OrchestrationEventType,
	OrchestrationEventTypes,
	type PlanCreatedEvent,
	type PlanUpdatedEvent,
	type ResourceAllocatedEvent,
	type TaskCompletedEvent,
	type TaskCreatedEvent,
	type TaskFailedEvent,
	type TaskStartedEvent,
} from './orchestration-events.js';

type OrchestrationEventPayloadMap = {
	[OrchestrationEventTypes.TaskCreated]: TaskCreatedEvent;
	[OrchestrationEventTypes.TaskStarted]: TaskStartedEvent;
	[OrchestrationEventTypes.TaskCompleted]: TaskCompletedEvent;
	[OrchestrationEventTypes.TaskFailed]: TaskFailedEvent;
	[OrchestrationEventTypes.AgentAssigned]: AgentAssignedEvent;
	[OrchestrationEventTypes.AgentFreed]: AgentFreedEvent;
	[OrchestrationEventTypes.PlanCreated]: PlanCreatedEvent;
	[OrchestrationEventTypes.PlanUpdated]: PlanUpdatedEvent;
	[OrchestrationEventTypes.CoordinationStarted]: CoordinationStartedEvent;
	[OrchestrationEventTypes.DecisionMade]: DecisionMadeEvent;
	[OrchestrationEventTypes.ResourceAllocated]: ResourceAllocatedEvent;
};

export type OrchestrationEventEnvelope<
	TType extends OrchestrationEventType = OrchestrationEventType,
> = Envelope & { type: TType; data: OrchestrationEventPayloadMap[TType] };

export type OrchestrationEventHandler<
	TType extends OrchestrationEventType = OrchestrationEventType,
> = {
	type: TType;
	handle: (event: OrchestrationEventEnvelope<TType>) => Promise<void> | void;
};

export interface OrchestrationPublishOptions {
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

export interface OrchestrationBusOptions {
	transport?: Transport;
	source?: string;
	acl?: TopicACL;
	busOptions?: BusOptions;
}

export interface OrchestrationBus {
	publish<TType extends OrchestrationEventType>(
		type: TType,
		payload: OrchestrationEventPayloadMap[TType],
		options?: OrchestrationPublishOptions,
	): Promise<void>;
	publishEnvelope(envelope: OrchestrationEventEnvelope): Promise<void>;
	bind(handlers: OrchestrationEventHandler[]): Promise<() => Promise<void>>;
}

const DEFAULT_SOURCE = 'urn:cortex:orchestration';

const DEFAULT_TOPIC_ACL: TopicACL = Object.freeze(
	Object.fromEntries(
		Object.values(OrchestrationEventTypes).map((type) => [
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

function isOrchestrationEventType(
	type: string,
): type is OrchestrationEventType {
	return type in ORCHESTRATION_EVENT_SCHEMAS;
}

function validateEnvelope(envelope: Envelope): OrchestrationEventEnvelope {
	if (!isOrchestrationEventType(envelope.type)) {
		throw new Error(`Unsupported orchestration event type: ${envelope.type}`);
	}
	const schema = ORCHESTRATION_EVENT_SCHEMAS[envelope.type];
	const data = schema.parse(envelope.data);
	return { ...envelope, data };
}

export function createOrchestrationBus(
	options: OrchestrationBusOptions = {},
): OrchestrationBus {
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
		async publish<TType extends OrchestrationEventType>(
			type: TType,
			payload: OrchestrationEventPayloadMap[TType],
			publishOptions?: OrchestrationPublishOptions,
		) {
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
			}) as OrchestrationEventEnvelope<TType>;
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
						await handler.handle(validated as OrchestrationEventEnvelope);
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
