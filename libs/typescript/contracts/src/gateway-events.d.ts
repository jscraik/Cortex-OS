import { z } from 'zod';
/**
 * Gateway-related A2A event schemas for inter-package communication
 */
export declare const RouteCreatedEventSchema: z.ZodObject<
	{
		routeId: z.ZodString;
		path: z.ZodString;
		method: z.ZodString;
		handler: z.ZodString;
		createdAt: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		path: string;
		routeId: string;
		method: string;
		handler: string;
		createdAt: string;
	},
	{
		path: string;
		routeId: string;
		method: string;
		handler: string;
		createdAt: string;
	}
>;
export declare const RequestReceivedEventSchema: z.ZodObject<
	{
		requestId: z.ZodString;
		path: z.ZodString;
		method: z.ZodString;
		userAgent: z.ZodOptional<z.ZodString>;
		receivedAt: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		path: string;
		method: string;
		requestId: string;
		receivedAt: string;
		userAgent?: string | undefined;
	},
	{
		path: string;
		method: string;
		requestId: string;
		receivedAt: string;
		userAgent?: string | undefined;
	}
>;
export declare const ResponseSentEventSchema: z.ZodObject<
	{
		requestId: z.ZodString;
		statusCode: z.ZodNumber;
		duration: z.ZodNumber;
		sentAt: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		duration: number;
		requestId: string;
		statusCode: number;
		sentAt: string;
	},
	{
		duration: number;
		requestId: string;
		statusCode: number;
		sentAt: string;
	}
>;
export declare const RateLimitExceededEventSchema: z.ZodObject<
	{
		path: z.ZodString;
		clientIp: z.ZodString;
		limit: z.ZodNumber;
		window: z.ZodNumber;
		exceededAt: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		path: string;
		clientIp: string;
		limit: number;
		window: number;
		exceededAt: string;
	},
	{
		path: string;
		clientIp: string;
		limit: number;
		window: number;
		exceededAt: string;
	}
>;
export type RouteCreatedEvent = z.infer<typeof RouteCreatedEventSchema>;
export type RequestReceivedEvent = z.infer<typeof RequestReceivedEventSchema>;
export type ResponseSentEvent = z.infer<typeof ResponseSentEventSchema>;
export type RateLimitExceededEvent = z.infer<
	typeof RateLimitExceededEventSchema
>;
export declare const createGatewayEvent: {
	routeCreated: (data: RouteCreatedEvent) => {
		type: 'gateway.route.created';
		data: {
			path: string;
			routeId: string;
			method: string;
			handler: string;
			createdAt: string;
		};
	};
	requestReceived: (data: RequestReceivedEvent) => {
		type: 'gateway.request.received';
		data: {
			path: string;
			method: string;
			requestId: string;
			receivedAt: string;
			userAgent?: string | undefined;
		};
	};
	responseSent: (data: ResponseSentEvent) => {
		type: 'gateway.response.sent';
		data: {
			duration: number;
			requestId: string;
			statusCode: number;
			sentAt: string;
		};
	};
	rateLimitExceeded: (data: RateLimitExceededEvent) => {
		type: 'gateway.rate_limit.exceeded';
		data: {
			path: string;
			clientIp: string;
			limit: number;
			window: number;
			exceededAt: string;
		};
	};
};
//# sourceMappingURL=gateway-events.d.ts.map
