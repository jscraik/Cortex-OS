import { z } from 'zod';

/**
 * Model Gateway-related A2A event schemas for inter-package communication
 */

// Request Routed Event
export const RequestRoutedEventSchema = z.object({
	requestId: z.string(),
	model: z.string(),
	provider: z.string(),
	routedAt: z.string(),
});

// Model Response Event
export const ModelResponseEventSchema = z.object({
	requestId: z.string(),
	model: z.string(),
	provider: z.string(),
	latency: z.number().positive(),
	tokens: z
		.object({
			input: z.number().nonnegative(),
			output: z.number().nonnegative(),
		})
		.optional(),
	completedAt: z.string(),
});

// Model Error Event
export const ModelErrorEventSchema = z.object({
	requestId: z.string(),
	model: z.string(),
	provider: z.string(),
	error: z.string(),
	errorCode: z.string().optional(),
	failedAt: z.string(),
});

// Provider Health Event
export const ProviderHealthEventSchema = z.object({
	provider: z.string(),
	status: z.enum(['healthy', 'degraded', 'unhealthy']),
	latency: z.number().positive().optional(),
	checkedAt: z.string(),
});

// Export event type definitions
export type RequestRoutedEvent = z.infer<typeof RequestRoutedEventSchema>;
export type ModelResponseEvent = z.infer<typeof ModelResponseEventSchema>;
export type ModelErrorEvent = z.infer<typeof ModelErrorEventSchema>;
export type ProviderHealthEvent = z.infer<typeof ProviderHealthEventSchema>;

// Helper function to create model gateway events
export const createModelGatewayEvent = {
	requestRouted: (data: RequestRoutedEvent) => ({
		type: 'model_gateway.request.routed' as const,
		data: RequestRoutedEventSchema.parse(data),
	}),
	modelResponse: (data: ModelResponseEvent) => ({
		type: 'model_gateway.response.completed' as const,
		data: ModelResponseEventSchema.parse(data),
	}),
	modelError: (data: ModelErrorEvent) => ({
		type: 'model_gateway.response.error' as const,
		data: ModelErrorEventSchema.parse(data),
	}),
	providerHealth: (data: ProviderHealthEvent) => ({
		type: 'model_gateway.provider.health' as const,
		data: ProviderHealthEventSchema.parse(data),
	}),
};
