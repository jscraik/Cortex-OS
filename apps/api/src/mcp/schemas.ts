import { z } from 'zod';

export const httpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

export const metadataSchema = z.record(z.string(), z.unknown()).optional();

export const gatewayRequestSchema = z.object({
	operationId: z.string().min(1, 'operationId is required'),
	method: httpMethodSchema,
	path: z.string().min(1, 'path is required'),
	payload: z.unknown().optional(),
	query: z.record(z.string(), z.unknown()).optional(),
	headers: z.record(z.string(), z.string()).optional(),
	apiKey: z.string().min(8, 'apiKey must be at least 8 characters').optional(),
	metadata: metadataSchema,
});

export type GatewayToolInput = z.infer<typeof gatewayRequestSchema>;

export const gatewayResponseSchema = z.object({
	statusCode: z.number().int().min(100).max(599),
	body: z.unknown(),
	headers: z.record(z.string(), z.string()),
	durationMs: z.number().nonnegative(),
	fromCache: z.boolean(),
	requestId: z.string(),
	auditId: z.string(),
});

export type GatewayToolResult = z.infer<typeof gatewayResponseSchema>;

export const routingRequestSchema = z.object({
	method: httpMethodSchema,
	path: z.string().min(1),
	operationId: z.string().optional(),
});

export type RoutingToolInput = z.infer<typeof routingRequestSchema>;

export const routeDefinitionSchema = z.object({
	id: z.string(),
	method: httpMethodSchema,
	path: z.string(),
	service: z.string(),
	action: z.string(),
	description: z.string(),
	transactional: z.boolean(),
	requiresAuth: z.boolean(),
	cacheTtlSeconds: z.number().int().positive().optional(),
	rateLimitPerMinute: z.number().int().positive().optional(),
	tags: z.array(z.string()).optional(),
});

export const routingResponseSchema = z.object({
	route: routeDefinitionSchema,
	inputShape: z.record(z.string(), z.unknown()),
	outputShape: z.record(z.string(), z.unknown()),
});

export type RoutingToolResult = z.infer<typeof routingResponseSchema>;

export const responseHandlingInputSchema = z.object({
	routeId: z.string(),
	statusCode: z.number().int().min(100).max(599),
	rawBody: z.unknown(),
	headers: z.record(z.string(), z.string()).optional(),
	durationMs: z.number().nonnegative(),
	requestId: z.string(),
	correlationId: z.string().optional(),
});

export const responseHandlingResultSchema = z.object({
	status: z.enum(['success', 'error']),
	body: z.unknown(),
	headers: z.record(z.string(), z.string()),
	metadata: z.record(z.string(), z.unknown()),
});

export type ResponseHandlingInput = z.infer<typeof responseHandlingInputSchema>;
export type ResponseHandlingResult = z.infer<typeof responseHandlingResultSchema>;

export const errorResponseSchema = z.object({
	code: z.string(),
	message: z.string(),
	details: z.record(z.string(), z.unknown()).optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
