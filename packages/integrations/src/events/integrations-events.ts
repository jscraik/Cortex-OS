import { z } from 'zod';

/**
 * Integrations A2A event schemas for inter-package communication
 */

// Integration Connected Event
export const IntegrationConnectedEventSchema = z.object({
	integrationId: z.string(),
	type: z.enum(['api', 'webhook', 'oauth', 'database', 'filesystem']),
	name: z.string(),
	endpoint: z.string().optional(),
	status: z.enum(['active', 'inactive', 'error']),
	connectedAt: z.string(),
});

// Data Sync Event
export const DataSyncEventSchema = z.object({
	integrationId: z.string(),
	syncId: z.string(),
	direction: z.enum(['inbound', 'outbound', 'bidirectional']),
	recordsProcessed: z.number().int().nonnegative(),
	status: z.enum(['started', 'completed', 'failed']),
	errorMessage: z.string().optional(),
	syncedAt: z.string(),
});

// API Call Event
export const ApiCallEventSchema = z.object({
	integrationId: z.string(),
	method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
	endpoint: z.string(),
	statusCode: z.number().int().positive(),
	duration: z.number().int().nonnegative(),
	requestSize: z.number().int().nonnegative().optional(),
	responseSize: z.number().int().nonnegative().optional(),
	calledAt: z.string(),
});

// Webhook Received Event
export const WebhookReceivedEventSchema = z.object({
	integrationId: z.string(),
	webhookId: z.string(),
	source: z.string(),
	event: z.string(),
	payloadSize: z.number().int().nonnegative(),
	processed: z.boolean(),
	receivedAt: z.string(),
});

// Export event type definitions
export type IntegrationConnectedEvent = z.infer<
	typeof IntegrationConnectedEventSchema
>;
export type DataSyncEvent = z.infer<typeof DataSyncEventSchema>;
export type ApiCallEvent = z.infer<typeof ApiCallEventSchema>;
export type WebhookReceivedEvent = z.infer<typeof WebhookReceivedEventSchema>;

// Helper function to create integration events
export const createIntegrationsEvent = {
	connected: (data: IntegrationConnectedEvent) => ({
		type: 'integrations.connection.established' as const,
		data: IntegrationConnectedEventSchema.parse(data),
	}),
	dataSynced: (data: DataSyncEvent) => ({
		type: 'integrations.data.synced' as const,
		data: DataSyncEventSchema.parse(data),
	}),
	apiCalled: (data: ApiCallEvent) => ({
		type: 'integrations.api.called' as const,
		data: ApiCallEventSchema.parse(data),
	}),
	webhookReceived: (data: WebhookReceivedEvent) => ({
		type: 'integrations.webhook.received' as const,
		data: WebhookReceivedEventSchema.parse(data),
	}),
};
