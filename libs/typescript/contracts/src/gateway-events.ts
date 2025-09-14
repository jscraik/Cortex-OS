import { z } from 'zod';

/**
 * Gateway-related A2A event schemas for inter-package communication
 */

// Route Created Event
export const RouteCreatedEventSchema = z.object({
	routeId: z.string(),
	path: z.string(),
	method: z.string(),
	handler: z.string(),
	createdAt: z.string(),
});

// Request Received Event
export const RequestReceivedEventSchema = z.object({
	requestId: z.string(),
	path: z.string(),
	method: z.string(),
	userAgent: z.string().optional(),
	receivedAt: z.string(),
});

// Response Sent Event
export const ResponseSentEventSchema = z.object({
	requestId: z.string(),
	statusCode: z.number(),
	duration: z.number().positive(),
	sentAt: z.string(),
});

// Rate Limit Exceeded Event
export const RateLimitExceededEventSchema = z.object({
	path: z.string(),
	clientIp: z.string(),
	limit: z.number(),
	window: z.number(),
	exceededAt: z.string(),
});

// Export event type definitions
export type RouteCreatedEvent = z.infer<typeof RouteCreatedEventSchema>;
export type RequestReceivedEvent = z.infer<typeof RequestReceivedEventSchema>;
export type ResponseSentEvent = z.infer<typeof ResponseSentEventSchema>;
export type RateLimitExceededEvent = z.infer<
	typeof RateLimitExceededEventSchema
>;

// Helper function to create gateway events
export const createGatewayEvent = {
	routeCreated: (data: RouteCreatedEvent) => ({
		type: 'gateway.route.created' as const,
		data: RouteCreatedEventSchema.parse(data),
	}),
	requestReceived: (data: RequestReceivedEvent) => ({
		type: 'gateway.request.received' as const,
		data: RequestReceivedEventSchema.parse(data),
	}),
	responseSent: (data: ResponseSentEvent) => ({
		type: 'gateway.response.sent' as const,
		data: ResponseSentEventSchema.parse(data),
	}),
	rateLimitExceeded: (data: RateLimitExceededEvent) => ({
		type: 'gateway.rate_limit.exceeded' as const,
		data: RateLimitExceededEventSchema.parse(data),
	}),
};
