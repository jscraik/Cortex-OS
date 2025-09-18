import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import { createEnvelope } from '@cortex-os/a2a-contracts/envelope';
import {
	AGUI_EVENT_TYPES,
	type AiRecommendationEvent,
	AiRecommendationEventSchema,
	type UiComponentRenderedEvent,
	UiComponentRenderedEventSchema,
	type UiStateChangedEvent,
	UiStateChangedEventSchema,
	type UserInteractionEvent,
	UserInteractionEventSchema,
} from './events.js';

/**
 * Helper functions to create CloudEvents envelopes for AGUI events
 */

export function createAguiComponentRenderedEvent(
	data: UiComponentRenderedEvent,
	options?: {
		source?: string;
		traceparent?: string;
		correlationId?: string;
	},
): Envelope {
	const validatedData = UiComponentRenderedEventSchema.parse(data);
	return createEnvelope({
		type: AGUI_EVENT_TYPES.COMPONENT_RENDERED,
		source: options?.source ?? 'urn:cortex:agui',
		data: validatedData,
		traceparent: options?.traceparent,
		correlationId: options?.correlationId,
	});
}

export function createAguiUserInteractionEvent(
	data: UserInteractionEvent,
	options?: {
		source?: string;
		traceparent?: string;
		correlationId?: string;
	},
): Envelope {
	const validatedData = UserInteractionEventSchema.parse(data);
	return createEnvelope({
		type: AGUI_EVENT_TYPES.USER_INTERACTION,
		source: options?.source ?? 'urn:cortex:agui',
		data: validatedData,
		traceparent: options?.traceparent,
		correlationId: options?.correlationId,
	});
}

export function createAguiAiRecommendationEvent(
	data: AiRecommendationEvent,
	options?: {
		source?: string;
		traceparent?: string;
		correlationId?: string;
	},
): Envelope {
	const validatedData = AiRecommendationEventSchema.parse(data);
	return createEnvelope({
		type: AGUI_EVENT_TYPES.AI_RECOMMENDATION,
		source: options?.source ?? 'urn:cortex:agui',
		data: validatedData,
		traceparent: options?.traceparent,
		correlationId: options?.correlationId,
	});
}

export function createAguiStateChangedEvent(
	data: UiStateChangedEvent,
	options?: {
		source?: string;
		traceparent?: string;
		correlationId?: string;
	},
): Envelope {
	const validatedData = UiStateChangedEventSchema.parse(data);
	return createEnvelope({
		type: AGUI_EVENT_TYPES.STATE_CHANGED,
		source: options?.source ?? 'urn:cortex:agui',
		data: validatedData,
		traceparent: options?.traceparent,
		correlationId: options?.correlationId,
	});
}

/**
 * Generic AGUI event creator that accepts any AGUI event type and data
 */
export function createAguiEvent(
	eventType: string,
	data: unknown,
	options?: {
		source?: string;
		traceparent?: string;
		correlationId?: string;
	},
): Envelope {
	switch (eventType) {
		case AGUI_EVENT_TYPES.COMPONENT_RENDERED:
			return createAguiComponentRenderedEvent(data as UiComponentRenderedEvent, options);
		case AGUI_EVENT_TYPES.USER_INTERACTION:
			return createAguiUserInteractionEvent(data as UserInteractionEvent, options);
		case AGUI_EVENT_TYPES.AI_RECOMMENDATION:
			return createAguiAiRecommendationEvent(data as AiRecommendationEvent, options);
		case AGUI_EVENT_TYPES.STATE_CHANGED:
			return createAguiStateChangedEvent(data as UiStateChangedEvent, options);
		default:
			throw new Error(`Unknown AGUI event type: ${eventType}`);
	}
}
