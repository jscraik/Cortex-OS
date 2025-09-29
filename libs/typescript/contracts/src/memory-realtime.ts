import { z } from 'zod';

const isoTimestamp = z.string().datetime({ offset: true });

export const RealtimeMemoryNamespaceSchema = z
	.string()
	.min(1)
	.max(64)
	.regex(/^[a-zA-Z0-9_-]+$/, 'Namespaces must be alphanumeric plus dash/underscore.');

export const RealtimeMemoryEventTypeSchema = z
	.string()
	.min(1)
	.max(128)
	.regex(/^[a-zA-Z0-9_.:-]+$/, 'Event types must be namespaced identifiers.');

export const RealtimeMemoryChangeEventSchema = z.object({
	type: z.enum(['create', 'update', 'delete']),
	memory: z.record(z.unknown()).optional(),
	previousMemory: z.record(z.unknown()).optional(),
	memoryId: z.string().optional(),
	timestamp: isoTimestamp,
	namespace: RealtimeMemoryNamespaceSchema,
	version: z.string().optional(),
});

const subscribeMessageSchema = z.object({
	type: z.literal('subscribe'),
	namespace: RealtimeMemoryNamespaceSchema,
	eventTypes: z.array(RealtimeMemoryEventTypeSchema).max(32).optional(),
	replaySince: isoTimestamp.optional(),
});

const unsubscribeMessageSchema = z.object({
	type: z.literal('unsubscribe'),
	namespace: RealtimeMemoryNamespaceSchema,
});

const pingMessageSchema = z.object({
	type: z.literal('ping'),
	timestamp: isoTimestamp.optional(),
});

export const RealtimeMemoryInboundMessageSchema = z.discriminatedUnion('type', [
	subscribeMessageSchema,
	unsubscribeMessageSchema,
	pingMessageSchema,
]);

export type RealtimeMemoryInboundMessage = z.infer<typeof RealtimeMemoryInboundMessageSchema>;

const connectedMessageSchema = z.object({
	type: z.literal('connected'),
	connectionId: z.string().min(1),
	message: z.string().min(1),
	timestamp: isoTimestamp,
	server: z
		.object({
			host: z.string().min(1),
			port: z.number().int().nonnegative(),
		})
		.optional(),
});

const subscriptionsRestoredMessageSchema = z.object({
	type: z.literal('subscriptions_restored'),
	subscriptions: z.array(RealtimeMemoryNamespaceSchema),
	timestamp: isoTimestamp,
});

const subscribedMessageSchema = z.object({
	type: z.literal('subscribed'),
	namespace: RealtimeMemoryNamespaceSchema,
	timestamp: isoTimestamp,
});

const unsubscribedMessageSchema = z.object({
	type: z.literal('unsubscribed'),
	namespace: RealtimeMemoryNamespaceSchema,
	timestamp: isoTimestamp,
});

const warningMessageSchema = z.object({
	type: z.literal('warning'),
	message: z.string().min(1),
	timestamp: isoTimestamp,
	code: z.string().optional(),
	details: z.record(z.unknown()).optional(),
});

const errorMessageSchema = z.object({
	type: z.literal('error'),
	message: z.string().min(1),
	timestamp: isoTimestamp,
	code: z.string().optional(),
	details: z.record(z.unknown()).optional(),
});

const pongMessageSchema = z.object({
	type: z.literal('pong'),
	timestamp: isoTimestamp,
});

const changeMessageSchema = z.object({
	type: z.literal('change'),
	event: RealtimeMemoryChangeEventSchema,
	namespace: RealtimeMemoryNamespaceSchema,
	timestamp: isoTimestamp,
});

export const RealtimeMemoryOutboundMessageSchema = z.discriminatedUnion('type', [
	connectedMessageSchema,
	subscriptionsRestoredMessageSchema,
	subscribedMessageSchema,
	unsubscribedMessageSchema,
	warningMessageSchema,
	errorMessageSchema,
	pongMessageSchema,
	changeMessageSchema,
]);

export type RealtimeMemoryOutboundMessage = z.infer<typeof RealtimeMemoryOutboundMessageSchema>;

export const RealtimeMemoryQueuedMessageSchema = z.object({
	namespace: RealtimeMemoryNamespaceSchema,
	payload: RealtimeMemoryOutboundMessageSchema,
	timestamp: isoTimestamp,
	expiresAt: isoTimestamp.optional(),
});

export type RealtimeMemoryQueuedMessage = z.infer<typeof RealtimeMemoryQueuedMessageSchema>;

export const RealtimeMemoryConnectionMetricsSchema = z.object({
	messagesSent: z.number().int().nonnegative(),
	messagesReceived: z.number().int().nonnegative(),
	bytesSent: z.number().int().nonnegative(),
	bytesReceived: z.number().int().nonnegative(),
	queueDepth: z.number().int().nonnegative(),
});

export const RealtimeMemoryConnectionStateSchema = z.object({
	connectionId: z.string().min(1),
	status: z.enum(['connecting', 'connected', 'authenticated', 'subscribed', 'closed']),
	subscriptions: z.array(RealtimeMemoryNamespaceSchema),
	connectedAt: isoTimestamp,
	lastActivityAt: isoTimestamp.optional(),
	isReconnecting: z.boolean().optional(),
	client: z
		.object({
			userAgent: z.string().optional(),
			remoteAddress: z.string().optional(),
		})
		.optional(),
	metrics: RealtimeMemoryConnectionMetricsSchema.optional(),
});

export type RealtimeMemoryConnectionState = z.infer<typeof RealtimeMemoryConnectionStateSchema>;

export const RealtimeMemoryMetricsAggregateSchema = z.object({
	totalConnections: z.number().int().nonnegative(),
	activeConnections: z.number().int().nonnegative(),
	reconnections: z.number().int().nonnegative(),
	messagesSent: z.number().int().nonnegative(),
	messagesReceived: z.number().int().nonnegative(),
	bytesSent: z.number().int().nonnegative(),
	bytesReceived: z.number().int().nonnegative(),
	lastActivityAt: isoTimestamp.optional(),
	connectionTimestamps: z.array(isoTimestamp),
});

export const RealtimeMemoryConnectionSummarySchema = RealtimeMemoryConnectionStateSchema.extend({
	metrics: RealtimeMemoryConnectionMetricsSchema,
});

export const RealtimeMemoryMetricsSnapshotSchema = z.object({
        snapshotId: z.string().min(1),
        brand: z.literal('brAInwav'),
        source: z.string().min(1),
        timestamp: isoTimestamp,
        description: z.string().min(1),
        reason: z.string().min(1),
        aggregate: RealtimeMemoryMetricsAggregateSchema,
        connections: z.array(RealtimeMemoryConnectionSummarySchema),
});

export type RealtimeMemoryMetricsSnapshot = z.infer<typeof RealtimeMemoryMetricsSnapshotSchema>;

export const RealtimeMemoryMetricsEventSchema = RealtimeMemoryMetricsSnapshotSchema.extend({
        type: z.literal('memory.realtime.metrics'),
});

export type RealtimeMemoryMetricsEvent = z.infer<typeof RealtimeMemoryMetricsEventSchema>;
