import { z } from 'zod';

/**
 * AGUI (AI Graphical User Interface) A2A event schemas for inter-package communication
 */

// UI Component Rendered Event
export const UiComponentRenderedEventSchema = z.object({
	componentId: z.string(),
	type: z.enum(['button', 'form', 'modal', 'chart', 'table', 'custom']),
	name: z.string(),
	properties: z.record(z.any()).optional(),
	parentId: z.string().optional(),
	renderedBy: z.string(),
	renderedAt: z.string(),
});

// User Interaction Event
export const UserInteractionEventSchema = z.object({
	interactionId: z.string(),
	componentId: z.string(),
	action: z.enum([
		'click',
		'hover',
		'focus',
		'input',
		'submit',
		'drag',
		'scroll',
	]),
	value: z.any().optional(),
	coordinates: z
		.object({
			x: z.number().int().nonnegative(),
			y: z.number().int().nonnegative(),
		})
		.optional(),
	userId: z.string().optional(),
	sessionId: z.string().optional(),
	interactedAt: z.string(),
});

// AI Recommendation Event
export const AiRecommendationEventSchema = z.object({
	recommendationId: z.string(),
	type: z.enum(['layout', 'accessibility', 'performance', 'ux', 'content']),
	component: z.string(),
	suggestion: z.string(),
	confidence: z.number().min(0).max(1),
	priority: z.enum(['low', 'medium', 'high']),
	generatedAt: z.string(),
});

// UI State Changed Event
export const UiStateChangedEventSchema = z.object({
	stateId: z.string(),
	componentId: z.string().optional(),
	previousState: z.record(z.any()),
	newState: z.record(z.any()),
	trigger: z.enum(['user_action', 'data_update', 'navigation', 'system']),
	changedAt: z.string(),
});

// Export event type definitions
export type UiComponentRenderedEvent = z.infer<
	typeof UiComponentRenderedEventSchema
>;
export type UserInteractionEvent = z.infer<typeof UserInteractionEventSchema>;
export type AiRecommendationEvent = z.infer<typeof AiRecommendationEventSchema>;
export type UiStateChangedEvent = z.infer<typeof UiStateChangedEventSchema>;

// Helper function to create AGUI events
export const createAguiEvent = {
	componentRendered: (data: UiComponentRenderedEvent) => ({
		type: 'agui.component.rendered' as const,
		data: UiComponentRenderedEventSchema.parse(data),
	}),
	userInteraction: (data: UserInteractionEvent) => ({
		type: 'agui.user.interaction' as const,
		data: UserInteractionEventSchema.parse(data),
	}),
	aiRecommendation: (data: AiRecommendationEvent) => ({
		type: 'agui.ai.recommendation' as const,
		data: AiRecommendationEventSchema.parse(data),
	}),
	stateChanged: (data: UiStateChangedEvent) => ({
		type: 'agui.state.changed' as const,
		data: UiStateChangedEventSchema.parse(data),
	}),
};
