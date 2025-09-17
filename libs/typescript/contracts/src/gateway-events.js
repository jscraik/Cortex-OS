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
// Helper function to create gateway events
export const createGatewayEvent = {
    routeCreated: (data) => ({
        type: 'gateway.route.created',
        data: RouteCreatedEventSchema.parse(data),
    }),
    requestReceived: (data) => ({
        type: 'gateway.request.received',
        data: RequestReceivedEventSchema.parse(data),
    }),
    responseSent: (data) => ({
        type: 'gateway.response.sent',
        data: ResponseSentEventSchema.parse(data),
    }),
    rateLimitExceeded: (data) => ({
        type: 'gateway.rate_limit.exceeded',
        data: RateLimitExceededEventSchema.parse(data),
    }),
};
//# sourceMappingURL=gateway-events.js.map