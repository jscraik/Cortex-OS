import { z } from 'zod';

/**
 * AGUI (AI Graphical User Interface) A2A event schemas for inter-package communication
 *
 * These schemas define the contract for AGUI-related events that flow through the A2A bus
 * and are consumed by various parts of the Cortex-OS system, including SSE clients.
 */

// UI Component Rendered Event
export const UiComponentRenderedEventSchema = z.object({
	componentId: z.string().describe('Unique identifier for the component'),
	type: z
		.enum(['button', 'form', 'modal', 'chart', 'table', 'custom'])
		.describe('Type of UI component'),
	name: z.string().describe('Human-readable name of the component'),
	properties: z.record(z.unknown()).optional().describe('Component properties and configuration'),
	parentId: z.string().optional().describe('ID of parent component if nested'),
	renderedBy: z.string().describe('Service/agent that rendered the component'),
	renderedAt: z.string().describe('ISO timestamp when the component was rendered'),
});

// User Interaction Event
export const UserInteractionEventSchema = z.object({
	interactionId: z.string().describe('Unique identifier for this interaction'),
	componentId: z.string().describe('ID of the component that was interacted with'),
	action: z
		.enum(['click', 'hover', 'focus', 'input', 'submit', 'drag', 'scroll'])
		.describe('Type of interaction performed'),
	value: z
		.unknown()
		.optional()
		.describe('Value associated with the interaction (e.g., input text)'),
	coordinates: z
		.object({
			x: z.number().int().nonnegative().describe('X coordinate of interaction'),
			y: z.number().int().nonnegative().describe('Y coordinate of interaction'),
		})
		.optional()
		.describe('Screen coordinates where interaction occurred'),
	userId: z.string().optional().describe('ID of user who performed the interaction'),
	sessionId: z.string().optional().describe('Session ID associated with the interaction'),
	interactedAt: z.string().describe('ISO timestamp when the interaction occurred'),
});

// AI Recommendation Event
export const AiRecommendationEventSchema = z.object({
	recommendationId: z.string().describe('Unique identifier for this recommendation'),
	type: z
		.enum(['layout', 'accessibility', 'performance', 'ux', 'content'])
		.describe('Category of recommendation'),
	component: z.string().describe('Target component for the recommendation'),
	suggestion: z.string().describe('Human-readable recommendation text'),
	confidence: z.number().min(0).max(1).describe('AI confidence in the recommendation (0-1)'),
	priority: z.enum(['low', 'medium', 'high']).describe('Priority level of the recommendation'),
	generatedAt: z.string().describe('ISO timestamp when recommendation was generated'),
});

// UI State Changed Event
export const UiStateChangedEventSchema = z.object({
	stateId: z.string().describe('Unique identifier for this state change'),
	componentId: z
		.string()
		.optional()
		.describe('ID of component whose state changed (if applicable)'),
	previousState: z.record(z.unknown()).describe('Previous state values'),
	newState: z.record(z.unknown()).describe('New state values'),
	trigger: z
		.enum(['user_action', 'data_update', 'navigation', 'system'])
		.describe('What triggered the state change'),
	changedAt: z.string().describe('ISO timestamp when the state changed'),
});

// Export event type definitions
export type UiComponentRenderedEvent = z.infer<typeof UiComponentRenderedEventSchema>;
export type UserInteractionEvent = z.infer<typeof UserInteractionEventSchema>;
export type AiRecommendationEvent = z.infer<typeof AiRecommendationEventSchema>;
export type UiStateChangedEvent = z.infer<typeof UiStateChangedEventSchema>;

// Union type for all AGUI events
export type AguiEvent =
	| UiComponentRenderedEvent
	| UserInteractionEvent
	| AiRecommendationEvent
	| UiStateChangedEvent;

// AGUI event type constants
export const AGUI_EVENT_TYPES = {
	COMPONENT_RENDERED: 'agui.component.rendered',
	USER_INTERACTION: 'agui.user.interaction',
	AI_RECOMMENDATION: 'agui.ai.recommendation',
	STATE_CHANGED: 'agui.state.changed',
} as const;

export type AguiEventType = (typeof AGUI_EVENT_TYPES)[keyof typeof AGUI_EVENT_TYPES];

/**
 * Schema registry for AGUI events - maps event types to their schemas
 */
export const AGUI_EVENT_SCHEMAS = {
	[AGUI_EVENT_TYPES.COMPONENT_RENDERED]: UiComponentRenderedEventSchema,
	[AGUI_EVENT_TYPES.USER_INTERACTION]: UserInteractionEventSchema,
	[AGUI_EVENT_TYPES.AI_RECOMMENDATION]: AiRecommendationEventSchema,
	[AGUI_EVENT_TYPES.STATE_CHANGED]: UiStateChangedEventSchema,
} as const;

/**
 * Validate an AGUI event against its schema
 */
export function validateAguiEvent(eventType: AguiEventType, data: unknown): AguiEvent {
	const schema = AGUI_EVENT_SCHEMAS[eventType];
	if (!schema) {
		throw new Error(`Unknown AGUI event type: ${eventType}`);
	}
	return schema.parse(data);
}

/**
 * Type guard to check if a string is a valid AGUI event type
 */
export function isAguiEventType(eventType: string): eventType is AguiEventType {
	return Object.values(AGUI_EVENT_TYPES).includes(eventType as AguiEventType);
}
