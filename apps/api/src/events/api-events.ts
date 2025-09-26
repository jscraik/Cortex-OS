import { z } from 'zod';

export const API_EVENT_SOURCE = 'urn:cortex:api';

export const API_EVENT_TYPES = {
	REQUEST_RECEIVED: 'cortex.api.request.received',
	REQUEST_ROUTED: 'cortex.api.request.routed',
	REQUEST_VALIDATED: 'cortex.api.request.validated',
	REQUEST_REJECTED: 'cortex.api.request.rejected',
	RESPONSE_GENERATED: 'cortex.api.response.generated',
	RESPONSE_CACHED: 'cortex.api.response.cached',
	RESPONSE_SENT: 'cortex.api.response.sent',
	WEBHOOK_RECEIVED: 'cortex.api.webhook.received',
	WEBHOOK_PROCESSED: 'cortex.api.webhook.processed',
	WEBHOOK_FAILED: 'cortex.api.webhook.failed',
	JOB_CREATED: 'cortex.api.job.created',
	JOB_STARTED: 'cortex.api.job.started',
	JOB_PROGRESS: 'cortex.api.job.progress',
	JOB_COMPLETED: 'cortex.api.job.completed',
	JOB_FAILED: 'cortex.api.job.failed',
	SERVICE_REQUEST: 'cortex.api.service.request',
	SERVICE_RESPONSE: 'cortex.api.service.response',
	SERVICE_ERROR: 'cortex.api.service.error',
	RATE_LIMIT_HIT: 'cortex.api.rate_limit.hit',
	AUTH_FAILED: 'cortex.api.auth.failed',
	SECURITY_VIOLATION: 'cortex.api.security.violation',
} as const;

const ApiRequestBaseSchema = z.object({
	requestId: z.string(),
	method: z.string(),
	path: z.string(),
	operationId: z.string().optional(),
	correlationId: z.string().optional(),
	source: z.string().optional(),
	timestamp: z.number(),
	metadata: z.record(z.unknown()).optional(),
});

export const ApiRequestReceivedEventSchema = ApiRequestBaseSchema.extend({
	userAgent: z.string().optional(),
	bodySize: z.number().optional(),
});

export const ApiRequestRoutedEventSchema = ApiRequestBaseSchema.extend({
	routeId: z.string(),
	handlerKey: z.string(),
	requiresAuth: z.boolean(),
	cacheable: z.boolean(),
	cacheTtlSeconds: z.number().optional(),
});

export const ApiRequestValidatedEventSchema = ApiRequestBaseSchema.extend({
	validation: z
		.object({
			status: z.enum(['passed', 'failed']),
			issues: z
				.array(
					z.object({
						field: z.string(),
						message: z.string(),
					}),
				)
				.optional(),
		})
		.optional(),
});

export const ApiRequestRejectedEventSchema = ApiRequestBaseSchema.extend({
	reason: z.string(),
});

const ApiResponseBaseSchema = ApiRequestBaseSchema.extend({
	statusCode: z.number(),
	durationMs: z.number(),
	fromCache: z.boolean(),
	bodySize: z.number().optional(),
	headers: z.record(z.string()).optional(),
});

export const ApiResponseGeneratedEventSchema = ApiResponseBaseSchema;

export const ApiResponseCachedEventSchema = ApiResponseBaseSchema.extend({
	cacheKey: z.string().optional(),
});

export const ApiResponseSentEventSchema = ApiResponseBaseSchema.extend({
	statusCode: z.number(),
	sentAt: z.number(),
});

const ApiWebhookBaseSchema = z.object({
	webhookId: z.string(),
	source: z.string(),
	event: z.string(),
	eventType: z.string().optional(),
	payload: z.unknown().optional(),
	headers: z.record(z.string()).optional(),
	signature: z.string().optional(),
	verified: z.boolean(),
	timestamp: z.number(),
	payloadSize: z.number().optional(),
});

export const ApiWebhookReceivedEventSchema = ApiWebhookBaseSchema;

export const ApiWebhookProcessedEventSchema = ApiWebhookBaseSchema.extend({
	result: z.unknown(),
});

export const ApiWebhookFailedEventSchema = ApiWebhookBaseSchema.extend({
	error: z.string(),
});

const ApiJobBaseSchema = z.object({
	jobId: z.string(),
	type: z.string(),
	status: z.enum(['created', 'started', 'progress', 'completed', 'failed']),
	metadata: z.record(z.unknown()).optional(),
	progress: z.number().min(0).max(100).optional(),
	result: z.unknown().optional(),
	error: z.string().optional(),
	estimatedDuration: z.number().optional(),
	actualDuration: z.number().optional(),
	timestamp: z.number().optional(),
});

export const ApiJobCreatedEventSchema = ApiJobBaseSchema.extend({
	status: z.literal('created'),
});

export const ApiJobStartedEventSchema = ApiJobBaseSchema.extend({
	status: z.literal('started'),
});

export const ApiJobProgressEventSchema = ApiJobBaseSchema.extend({
	status: z.literal('progress'),
	progress: z.number().min(0).max(100),
});

export const ApiJobCompletedEventSchema = ApiJobBaseSchema.extend({
	status: z.literal('completed'),
	result: z.unknown(),
	actualDuration: z.number().optional(),
});

export const ApiJobFailedEventSchema = ApiJobBaseSchema.extend({
	status: z.literal('failed'),
	error: z.string(),
});

const ApiServiceEventBaseSchema = ApiRequestBaseSchema.extend({
	targetService: z.string(),
	action: z.string(),
	timeout: z.number().optional(),
	metadata: z.record(z.unknown()).optional(),
});

export const ApiServiceRequestEventSchema = ApiServiceEventBaseSchema;

export const ApiServiceResponseEventSchema = ApiServiceEventBaseSchema.extend({
	statusCode: z.number().optional(),
	response: z.unknown().optional(),
});

export const ApiServiceErrorEventSchema = ApiServiceEventBaseSchema.extend({
	error: z.string(),
	severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

const ApiSecurityEventBaseSchema = ApiRequestBaseSchema.extend({
	violationType: z.enum(['rate_limit', 'auth_failure', 'security_violation']),
	details: z.record(z.unknown()),
	severity: z.enum(['low', 'medium', 'high', 'critical']),
	clientIp: z.string().optional(),
	userAgent: z.string().optional(),
});

export const ApiRateLimitHitEventSchema = ApiSecurityEventBaseSchema.extend({
	violationType: z.literal('rate_limit'),
});

export const ApiAuthFailedEventSchema = ApiSecurityEventBaseSchema.extend({
	violationType: z.literal('auth_failure'),
});

export const ApiSecurityViolationEventSchema = ApiSecurityEventBaseSchema.extend({
	violationType: z.literal('security_violation'),
});

export const API_EVENT_DEFINITIONS = {
	[API_EVENT_TYPES.REQUEST_RECEIVED]: {
		schema: ApiRequestReceivedEventSchema,
		description: 'Emitted when a new HTTP request is received by the API gateway',
		tags: ['api', 'request'],
		examples: [
			{
				requestId: 'req-001',
				method: 'POST',
				path: '/api/agents',
				correlationId: 'corr-123',
				source: 'web-client',
				timestamp: Date.now(),
				userAgent: 'Mozilla/5.0',
				bodySize: 512,
			},
		],
	},
	[API_EVENT_TYPES.REQUEST_ROUTED]: {
		schema: ApiRequestRoutedEventSchema,
		description: 'Records request routing decisions and handler assignments',
		tags: ['api', 'routing'],
		examples: [
			{
				requestId: 'req-001',
				routeId: 'agents.create',
				handlerKey: 'agents.createAgent',
				requiresAuth: true,
				cacheable: false,
				timestamp: Date.now(),
			},
		],
	},
	[API_EVENT_TYPES.REQUEST_VALIDATED]: {
		schema: ApiRequestValidatedEventSchema,
		description: 'Captures validation outcomes for incoming requests',
		tags: ['api', 'request', 'validation'],
		examples: [
			{
				requestId: 'req-002',
				method: 'POST',
				path: '/api/orders',
				timestamp: Date.now(),
				validation: { status: 'passed' },
			},
		],
	},
	[API_EVENT_TYPES.REQUEST_REJECTED]: {
		schema: ApiRequestRejectedEventSchema,
		description: 'Emitted when a request is rejected before execution',
		tags: ['api', 'request', 'rejection'],
		examples: [
			{
				requestId: 'req-003',
				method: 'POST',
				path: '/api/orders',
				timestamp: Date.now(),
				reason: 'Unauthorized',
			},
		],
	},
	[API_EVENT_TYPES.RESPONSE_GENERATED]: {
		schema: ApiResponseGeneratedEventSchema,
		description: 'Captures API response metrics and performance data',
		tags: ['api', 'response'],
		examples: [
			{
				requestId: 'req-001',
				method: 'POST',
				path: '/api/agents',
				statusCode: 201,
				durationMs: 250,
				fromCache: false,
				bodySize: 1024,
				timestamp: Date.now(),
			},
		],
	},
	[API_EVENT_TYPES.RESPONSE_CACHED]: {
		schema: ApiResponseCachedEventSchema,
		description: 'Indicates a response was served from cache',
		tags: ['api', 'response', 'cache'],
		examples: [
			{
				requestId: 'req-010',
				method: 'GET',
				path: '/api/cache',
				statusCode: 200,
				durationMs: 5,
				fromCache: true,
				cacheKey: 'cache:req-010',
				timestamp: Date.now(),
			},
		],
	},
	[API_EVENT_TYPES.RESPONSE_SENT]: {
		schema: ApiResponseSentEventSchema,
		description: 'Marks that an API response has been sent to the client',
		tags: ['api', 'response'],
		examples: [
			{
				requestId: 'req-011',
				method: 'GET',
				path: '/api/agents',
				statusCode: 200,
				durationMs: 45,
				fromCache: false,
				sentAt: Date.now(),
			},
		],
	},
	[API_EVENT_TYPES.WEBHOOK_RECEIVED]: {
		schema: ApiWebhookReceivedEventSchema,
		description: 'Logs incoming webhook events for processing',
		tags: ['api', 'webhook'],
		examples: [
			{
				webhookId: 'webhook-001',
				source: 'github',
				event: 'push',
				verified: true,
				payload: { ref: 'main' },
				timestamp: Date.now(),
			},
		],
	},
	[API_EVENT_TYPES.WEBHOOK_PROCESSED]: {
		schema: ApiWebhookProcessedEventSchema,
		description: 'Represents successful webhook processing results',
		tags: ['api', 'webhook'],
		examples: [
			{
				webhookId: 'webhook-002',
				source: 'stripe',
				event: 'payment.succeeded',
				verified: true,
				result: { processed: true },
				timestamp: Date.now(),
			},
		],
	},
	[API_EVENT_TYPES.WEBHOOK_FAILED]: {
		schema: ApiWebhookFailedEventSchema,
		description: 'Captures webhook processing failures and context',
		tags: ['api', 'webhook', 'error'],
		examples: [
			{
				webhookId: 'webhook-003',
				source: 'stripe',
				event: 'payment.failed',
				verified: false,
				error: 'Invalid signature',
				timestamp: Date.now(),
			},
		],
	},
	[API_EVENT_TYPES.JOB_CREATED]: {
		schema: ApiJobCreatedEventSchema,
		description: 'Tracks asynchronous job creation and lifecycle',
		tags: ['api', 'jobs'],
		examples: [
			{
				jobId: 'job-001',
				type: 'data-processing',
				status: 'created',
				estimatedDuration: 30000,
				metadata: { priority: 'high' },
				timestamp: Date.now(),
			},
		],
	},
	[API_EVENT_TYPES.JOB_STARTED]: {
		schema: ApiJobStartedEventSchema,
		description: 'Indicates an asynchronous job has begun execution',
		tags: ['api', 'jobs'],
		examples: [
			{
				jobId: 'job-001',
				type: 'data-processing',
				status: 'started',
				metadata: { priority: 'high' },
				timestamp: Date.now(),
			},
		],
	},
	[API_EVENT_TYPES.JOB_PROGRESS]: {
		schema: ApiJobProgressEventSchema,
		description: 'Updates current progress for an in-flight job',
		tags: ['api', 'jobs'],
		examples: [
			{
				jobId: 'job-001',
				type: 'data-processing',
				status: 'progress',
				progress: 50,
				timestamp: Date.now(),
			},
		],
	},
	[API_EVENT_TYPES.JOB_COMPLETED]: {
		schema: ApiJobCompletedEventSchema,
		description: 'Signals that a job finished successfully',
		tags: ['api', 'jobs'],
		examples: [
			{
				jobId: 'job-001',
				type: 'data-processing',
				status: 'completed',
				result: { processedRecords: 1000 },
				timestamp: Date.now(),
			},
		],
	},
	[API_EVENT_TYPES.JOB_FAILED]: {
		schema: ApiJobFailedEventSchema,
		description: 'Captures job failures and related diagnostics',
		tags: ['api', 'jobs', 'error'],
		examples: [
			{
				jobId: 'job-002',
				type: 'file-upload',
				status: 'failed',
				error: 'File format not supported',
				timestamp: Date.now(),
			},
		],
	},
	[API_EVENT_TYPES.SERVICE_REQUEST]: {
		schema: ApiServiceRequestEventSchema,
		description: 'Emitted when the API requests work from another service',
		tags: ['api', 'service'],
		examples: [
			{
				requestId: 'svc-001',
				targetService: 'user-service',
				action: 'validateUser',
				metadata: { data: { userId: 'user-123' } },
				timestamp: Date.now(),
			},
		],
	},
	[API_EVENT_TYPES.SERVICE_RESPONSE]: {
		schema: ApiServiceResponseEventSchema,
		description: 'Captures responses from downstream service requests',
		tags: ['api', 'service'],
		examples: [
			{
				requestId: 'svc-001',
				targetService: 'user-service',
				action: 'validateUser',
				statusCode: 200,
				response: { valid: true },
				timestamp: Date.now(),
			},
		],
	},
	[API_EVENT_TYPES.SERVICE_ERROR]: {
		schema: ApiServiceErrorEventSchema,
		description: 'Records failures when invoking downstream services',
		tags: ['api', 'service', 'error'],
		examples: [
			{
				requestId: 'svc-002',
				targetService: 'billing-service',
				action: 'chargeCustomer',
				error: 'Timeout',
				severity: 'high',
				timestamp: Date.now(),
			},
		],
	},
	[API_EVENT_TYPES.RATE_LIMIT_HIT]: {
		schema: ApiRateLimitHitEventSchema,
		description: 'Indicates that a client exceeded configured rate limits',
		tags: ['api', 'security'],
		examples: [
			{
				requestId: 'sec-001',
				violationType: 'rate_limit',
				severity: 'high',
				details: { requestCount: 1000 },
				timestamp: Date.now(),
			},
		],
	},
	[API_EVENT_TYPES.AUTH_FAILED]: {
		schema: ApiAuthFailedEventSchema,
		description: 'Records authentication failures for observability',
		tags: ['api', 'security'],
		examples: [
			{
				requestId: 'sec-002',
				violationType: 'auth_failure',
				severity: 'medium',
				details: { apiKey: 'invalid' },
				timestamp: Date.now(),
			},
		],
	},
	[API_EVENT_TYPES.SECURITY_VIOLATION]: {
		schema: ApiSecurityViolationEventSchema,
		description: 'Captures general security violations detected by the API',
		tags: ['api', 'security'],
		examples: [
			{
				requestId: 'sec-003',
				violationType: 'security_violation',
				severity: 'critical',
				details: { type: 'sql_injection' },
				timestamp: Date.now(),
			},
		],
	},
} as const;

export type ApiEventDefinition = (typeof API_EVENT_DEFINITIONS)[keyof typeof API_EVENT_DEFINITIONS];

export type ApiRequestReceivedEvent = z.infer<typeof ApiRequestReceivedEventSchema>;
export type ApiRequestRoutedEvent = z.infer<typeof ApiRequestRoutedEventSchema>;
export type ApiResponseGeneratedEvent = z.infer<typeof ApiResponseGeneratedEventSchema>;
export type ApiWebhookReceivedEvent = z.infer<typeof ApiWebhookReceivedEventSchema>;
export type ApiJobCreatedEvent = z.infer<typeof ApiJobCreatedEventSchema>;

export const createApiEvent = {
	requestReceived: (data: ApiRequestReceivedEvent) => ({
		type: API_EVENT_TYPES.REQUEST_RECEIVED,
		data: ApiRequestReceivedEventSchema.parse(data),
	}),
	requestRouted: (data: ApiRequestRoutedEvent) => ({
		type: API_EVENT_TYPES.REQUEST_ROUTED,
		data: ApiRequestRoutedEventSchema.parse(data),
	}),
	responseGenerated: (data: ApiResponseGeneratedEvent) => ({
		type: API_EVENT_TYPES.RESPONSE_GENERATED,
		data: ApiResponseGeneratedEventSchema.parse(data),
	}),
	webhookReceived: (data: ApiWebhookReceivedEvent) => ({
		type: API_EVENT_TYPES.WEBHOOK_RECEIVED,
		data: ApiWebhookReceivedEventSchema.parse(data),
	}),
	jobCreated: (data: ApiJobCreatedEvent) => ({
		type: API_EVENT_TYPES.JOB_CREATED,
		data: ApiJobCreatedEventSchema.parse(data),
	}),
};
