import { z } from 'zod';

/**
 * API-related A2A event schemas for inter-package communication
 */

export const API_EVENT_SOURCE = 'urn:cortex:api';

// Request Received Event
export const ApiRequestReceivedEventSchema = z.object({
	requestId: z.string(),
	method: z.string(),
	path: z.string(),
	correlationId: z.string().optional(),
	source: z.string(),
	timestamp: z.number(),
	userAgent: z.string().optional(),
	bodySize: z.number().optional(),
});

// Request Routed Event
export const ApiRequestRoutedEventSchema = z.object({
	requestId: z.string(),
	routeId: z.string(),
	handlerKey: z.string(),
	requiresAuth: z.boolean(),
	cacheable: z.boolean(),
	cacheTtlSeconds: z.number().optional(),
	timestamp: z.number(),
});

// Response Generated Event
export const ApiResponseGeneratedEventSchema = z.object({
	requestId: z.string(),
	method: z.string(),
	path: z.string(),
	statusCode: z.number(),
	durationMs: z.number(),
	fromCache: z.boolean(),
	bodySize: z.number(),
	timestamp: z.number(),
});

// Webhook Received Event
export const ApiWebhookReceivedEventSchema = z.object({
	webhookId: z.string(),
	source: z.string(),
	event: z.string(),
	timestamp: z.number(),
	verified: z.boolean(),
	payloadSize: z.number().optional(),
});

// Job Created Event
export const ApiJobCreatedEventSchema = z.object({
	jobId: z.string(),
	type: z.string(),
	status: z.enum(['created', 'started', 'completed', 'failed']),
	estimatedDuration: z.number().optional(),
	metadata: z.record(z.unknown()).optional(),
	createdAt: z.number(),
});

// Export event type definitions
export type ApiRequestReceivedEvent = z.infer<typeof ApiRequestReceivedEventSchema>;
export type ApiRequestRoutedEvent = z.infer<typeof ApiRequestRoutedEventSchema>;
export type ApiResponseGeneratedEvent = z.infer<typeof ApiResponseGeneratedEventSchema>;
export type ApiWebhookReceivedEvent = z.infer<typeof ApiWebhookReceivedEventSchema>;
export type ApiJobCreatedEvent = z.infer<typeof ApiJobCreatedEventSchema>;

// Helper object to create API events
export const createApiEvent = {
	requestReceived: (data: ApiRequestReceivedEvent) => ({
		type: 'api.request.received' as const,
		data: ApiRequestReceivedEventSchema.parse(data),
	}),
	requestRouted: (data: ApiRequestRoutedEvent) => ({
		type: 'api.request.routed' as const,
		data: ApiRequestRoutedEventSchema.parse(data),
	}),
	responseGenerated: (data: ApiResponseGeneratedEvent) => ({
		type: 'api.response.generated' as const,
		data: ApiResponseGeneratedEventSchema.parse(data),
	}),
	webhookReceived: (data: ApiWebhookReceivedEvent) => ({
		type: 'api.webhook.received' as const,
		data: ApiWebhookReceivedEventSchema.parse(data),
	}),
	jobCreated: (data: ApiJobCreatedEvent) => ({
		type: 'api.job.created' as const,
		data: ApiJobCreatedEventSchema.parse(data),
	}),
};
