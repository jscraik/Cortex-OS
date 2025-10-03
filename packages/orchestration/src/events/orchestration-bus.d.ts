import { type Envelope, type TopicACL } from '@cortex-os/a2a-contracts';
import { type BusOptions } from '@cortex-os/a2a-core/bus';
import type { Transport } from '@cortex-os/a2a-core/transport';
import {
	type AgentAssignedEvent,
	type AgentCoordinationStartedEvent,
	type AgentFreedEvent,
	type CoordinationStartedEvent,
	type DecisionMadeEvent,
	type OrchestrationEventType,
	OrchestrationEventTypes,
	type PlanCreatedEvent,
	type PlanUpdatedEvent,
	type ResourceAllocatedEvent,
	type ScheduleAdjustedEvent,
	type TaskCompletedEvent,
	type TaskCreatedEvent,
	type TaskFailedEvent,
	type TaskStartedEvent,
	type ToolLayerInvokedEvent,
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
	[OrchestrationEventTypes.AgentCoordinationStarted]: AgentCoordinationStartedEvent;
	[OrchestrationEventTypes.ScheduleAdjusted]: ScheduleAdjustedEvent;
	[OrchestrationEventTypes.ToolLayerInvoked]: ToolLayerInvokedEvent;
};
export type OrchestrationEventEnvelope<
	TType extends keyof OrchestrationEventPayloadMap = OrchestrationEventType,
> = Omit<Envelope, 'data' | 'type'> & {
	type: TType;
	data: OrchestrationEventPayloadMap[TType];
};
export type OrchestrationEventHandler<
	TType extends keyof OrchestrationEventPayloadMap = OrchestrationEventType,
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
	publish<TType extends keyof OrchestrationEventPayloadMap>(
		type: TType,
		payload: OrchestrationEventPayloadMap[TType],
		options?: OrchestrationPublishOptions,
	): Promise<void>;
	publishEnvelope(envelope: OrchestrationEventEnvelope): Promise<void>;
	bind(handlers: OrchestrationEventHandler[]): Promise<() => Promise<void>>;
}
export declare function createOrchestrationBus(options?: OrchestrationBusOptions): OrchestrationBus;
export { OrchestrationEventTypes };
//# sourceMappingURL=orchestration-bus.d.ts.map
