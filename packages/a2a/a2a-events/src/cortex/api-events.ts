import { z } from 'zod';

/**
 * Cortex-OS API-related A2A event schemas for inter-package communication
 */

export const CORTEX_API_EVENT_SOURCE = 'urn:cortex:api';

// Request Received Event
export const ApiRequestReceivedEventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.literal('cortex.api.request.received'),
  source: z.literal('cortex-api'),
  timestamp: z.string().datetime(),

  // Event-specific data
  requestId: z.string(),
  method: z.string(),
  path: z.string(),
  correlationId: z.string().optional(),
  sourceClient: z.string(),
  userAgent: z.string().optional(),
  bodySize: z.number().optional(),
  headers: z.record(z.string()).optional(),
  
  // Metadata
  metadata: z.record(z.string()).optional(),
});

// Request Routed Event
export const ApiRequestRoutedEventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.literal('cortex.api.request.routed'),
  source: z.literal('cortex-api'),
  timestamp: z.string().datetime(),

  // Event-specific data
  requestId: z.string(),
  routeId: z.string(),
  handlerKey: z.string(),
  requiresAuth: z.boolean(),
  cacheable: z.boolean(),
  cacheTtlSeconds: z.number().optional(),
  routeParams: z.record(z.string()).optional(),
  
  // Metadata
  metadata: z.record(z.string()).optional(),
});

// Response Generated Event
export const ApiResponseGeneratedEventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.literal('cortex.api.response.generated'),
  source: z.literal('cortex-api'),
  timestamp: z.string().datetime(),

  // Event-specific data
  requestId: z.string(),
  method: z.string(),
  path: z.string(),
  statusCode: z.number(),
  durationMs: z.number(),
  fromCache: z.boolean(),
  bodySize: z.number(),
  headers: z.record(z.string()).optional(),
  
  // Metadata
  metadata: z.record(z.string()).optional(),
});

// Webhook Received Event
export const ApiWebhookReceivedEventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.literal('cortex.api.webhook.received'),
  source: z.literal('cortex-api'),
  timestamp: z.string().datetime(),

  // Event-specific data
  webhookId: z.string(),
  sourceSystem: z.string(),
  eventType: z.string(),
  timestampReceived: z.string().datetime(),
  verified: z.boolean(),
  payloadSize: z.number().optional(),
  signatureValid: z.boolean().optional(),
  
  // Metadata
  metadata: z.record(z.string()).optional(),
});

// Job Created Event
export const ApiJobCreatedEventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.literal('cortex.api.job.created'),
  source: z.literal('cortex-api'),
  timestamp: z.string().datetime(),

  // Event-specific data
  jobId: z.string(),
  jobType: z.string(),
  status: z.enum(['created', 'started', 'completed', 'failed']),
  estimatedDuration: z.number().optional(),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  metadata: z.record(z.unknown()).optional(),
  
  // Metadata
  metadata: z.record(z.string()).optional(),
});

// Export event type definitions
export type ApiRequestReceivedEvent = z.infer<typeof ApiRequestReceivedEventSchema>;
export type ApiRequestRoutedEvent = z.infer<typeof ApiRequestRoutedEventSchema>;
export type ApiResponseGeneratedEvent = z.infer<typeof ApiResponseGeneratedEventSchema>;
export type ApiWebhookReceivedEvent = z.infer<typeof ApiWebhookReceivedEventSchema>;
export type ApiJobCreatedEvent = z.infer<typeof ApiJobCreatedEventSchema>;

// Validation Functions
export function validateApiRequestReceivedEvent(data: unknown): ApiRequestReceivedEvent {
  return ApiRequestReceivedEventSchema.parse(data);
}

export function isApiRequestReceivedEvent(data: unknown): data is ApiRequestReceivedEvent {
  return ApiRequestReceivedEventSchema.safeParse(data).success;
}

export function validateApiRequestRoutedEvent(data: unknown): ApiRequestRoutedEvent {
  return ApiRequestRoutedEventSchema.parse(data);
}

export function isApiRequestRoutedEvent(data: unknown): data is ApiRequestRoutedEvent {
  return ApiRequestRoutedEventSchema.safeParse(data).success;
}

export function validateApiResponseGeneratedEvent(data: unknown): ApiResponseGeneratedEvent {
  return ApiResponseGeneratedEventSchema.parse(data);
}

export function isApiResponseGeneratedEvent(data: unknown): data is ApiResponseGeneratedEvent {
  return ApiResponseGeneratedEventSchema.safeParse(data).success;
}

export function validateApiWebhookReceivedEvent(data: unknown): ApiWebhookReceivedEvent {
  return ApiWebhookReceivedEventSchema.parse(data);
}

export function isApiWebhookReceivedEvent(data: unknown): data is ApiWebhookReceivedEvent {
  return ApiWebhookReceivedEventSchema.safeParse(data).success;
}

export function validateApiJobCreatedEvent(data: unknown): ApiJobCreatedEvent {
  return ApiJobCreatedEventSchema.parse(data);
}

export function isApiJobCreatedEvent(data: unknown): data is ApiJobCreatedEvent {
  return ApiJobCreatedEventSchema.safeParse(data).success;
}

// Helper object to create API events
export const createApiEvent = {
  requestReceived: (data: Omit<ApiRequestReceivedEvent, 'event_id' | 'event_type' | 'source' | 'timestamp'>) => ({
    event_id: crypto.randomUUID(),
    event_type: 'cortex.api.request.received' as const,
    source: 'cortex-api' as const,
    timestamp: new Date().toISOString(),
    ...data,
  }),
  requestRouted: (data: Omit<ApiRequestRoutedEvent, 'event_id' | 'event_type' | 'source' | 'timestamp'>) => ({
    event_id: crypto.randomUUID(),
    event_type: 'cortex.api.request.routed' as const,
    source: 'cortex-api' as const,
    timestamp: new Date().toISOString(),
    ...data,
  }),
  responseGenerated: (data: Omit<ApiResponseGeneratedEvent, 'event_id' | 'event_type' | 'source' | 'timestamp'>) => ({
    event_id: crypto.randomUUID(),
    event_type: 'cortex.api.response.generated' as const,
    source: 'cortex-api' as const,
    timestamp: new Date().toISOString(),
    ...data,
  }),
  webhookReceived: (data: Omit<ApiWebhookReceivedEvent, 'event_id' | 'event_type' | 'source' | 'timestamp'>) => ({
    event_id: crypto.randomUUID(),
    event_type: 'cortex.api.webhook.received' as const,
    source: 'cortex-api' as const,
    timestamp: new Date().toISOString(),
    ...data,
  }),
  jobCreated: (data: Omit<ApiJobCreatedEvent, 'event_id' | 'event_type' | 'source' | 'timestamp'>) => ({
    event_id: crypto.randomUUID(),
    event_type: 'cortex.api.job.created' as const,
    source: 'cortex-api' as const,
    timestamp: new Date().toISOString(),
    ...data,
  }),
};