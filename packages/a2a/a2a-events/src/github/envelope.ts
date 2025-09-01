import { z } from 'zod';
import { ErrorEvent, ErrorEventSchema } from './error';
import { IssueEvent, IssueEventSchema } from './issue';
import { PullRequestEvent, PullRequestEventSchema } from './pull-request';
import { RepositoryEvent, RepositoryEventSchema } from './repository';
import { WorkflowEvent, WorkflowEventSchema } from './workflow';

// GitHub Event Union Type
export const GitHubEventDataSchema = z.discriminatedUnion('event_type', [
  RepositoryEventSchema,
  PullRequestEventSchema,
  IssueEventSchema,
  WorkflowEventSchema,
  ErrorEventSchema,
]);

export type GitHubEventData = z.infer<typeof GitHubEventDataSchema>;

// A2A Event Envelope Priority
export const EventPrioritySchema = z.enum(['low', 'normal', 'high', 'critical']);
export type EventPriority = z.infer<typeof EventPrioritySchema>;

// A2A Event Envelope Delivery Mode
export const DeliveryModeSchema = z.enum(['fire_and_forget', 'at_least_once', 'exactly_once']);
export type DeliveryMode = z.infer<typeof DeliveryModeSchema>;

// A2A Event Envelope Retry Policy
export const RetryPolicySchema = z.object({
  max_attempts: z.number().min(1).max(10).default(3),
  initial_delay_ms: z.number().positive().default(1000),
  max_delay_ms: z.number().positive().default(30000),
  backoff_multiplier: z.number().positive().default(2),
  jitter: z.boolean().default(true),
});

export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

// A2A Event Envelope Correlation Info
export const CorrelationInfoSchema = z.object({
  correlation_id: z.string().uuid(),
  causation_id: z.string().uuid().optional(),
  conversation_id: z.string().uuid().optional(),
  session_id: z.string().uuid().optional(),
  trace_id: z.string().optional(),
  span_id: z.string().optional(),
});

export type CorrelationInfo = z.infer<typeof CorrelationInfoSchema>;

// A2A Event Envelope Routing Info
export const RoutingInfoSchema = z.object({
  topic: z.string(),
  partition_key: z.string().optional(),
  routing_key: z.string().optional(),
  target_service: z.string().optional(),
  broadcast: z.boolean().default(false),
});

export type RoutingInfo = z.infer<typeof RoutingInfoSchema>;

// A2A Event Envelope Metadata
export const EnvelopeMetadataSchema = z.object({
  version: z.string().default('1.0'),
  schema_version: z.string().default('1.0'),
  content_type: z.string().default('application/json'),
  encoding: z.string().default('utf-8'),
  compression: z.enum(['none', 'gzip', 'brotli']).default('none'),
  size_bytes: z.number().positive().optional(),
  checksum: z.string().optional(),
  tags: z.array(z.string()).default([]),
  labels: z.record(z.string()).default({}),
});

export type EnvelopeMetadata = z.infer<typeof EnvelopeMetadataSchema>;

// A2A Event Envelope
export const A2AEventEnvelopeSchema = z.object({
  // Envelope identification
  envelope_id: z.string().uuid(),
  envelope_version: z.string().default('1.0'),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime().optional(),

  // Event data
  event: GitHubEventDataSchema,

  // Routing and delivery
  routing: RoutingInfoSchema,
  priority: EventPrioritySchema.default('normal'),
  delivery_mode: DeliveryModeSchema.default('at_least_once'),
  retry_policy: RetryPolicySchema.default({}),

  // Correlation and tracing
  correlation: CorrelationInfoSchema,

  // Metadata
  metadata: EnvelopeMetadataSchema.default({}),

  // Processing state (set by A2A infrastructure)
  processing_state: z
    .object({
      attempt_count: z.number().min(0).default(0),
      first_attempt_at: z.string().datetime().optional(),
      last_attempt_at: z.string().datetime().optional(),
      next_retry_at: z.string().datetime().optional(),
      error_count: z.number().min(0).default(0),
      last_error: z.string().optional(),
    })
    .optional(),

  // Source information
  source_info: z
    .object({
      service_name: z.string().default('github-client'),
      service_version: z.string().optional(),
      host_name: z.string().optional(),
      process_id: z.string().optional(),
      thread_id: z.string().optional(),
      user_id: z.string().optional(),
    })
    .default({ service_name: 'github-client' }),
});

export type A2AEventEnvelope = z.infer<typeof A2AEventEnvelopeSchema>;

// Validation Functions
export function validateA2AEventEnvelope(data: unknown): A2AEventEnvelope {
  return A2AEventEnvelopeSchema.parse(data);
}

export function isA2AEventEnvelope(data: unknown): data is A2AEventEnvelope {
  return A2AEventEnvelopeSchema.safeParse(data).success;
}

// Envelope Creation Helper
export function createA2AEventEnvelope(
  event: GitHubEventData,
  options?: {
    priority?: EventPriority;
    deliveryMode?: DeliveryMode;
    retryPolicy?: Partial<RetryPolicy>;
    correlation?: Partial<CorrelationInfo>;
    routing?: Partial<RoutingInfo>;
    metadata?: Partial<EnvelopeMetadata>;
    expiresIn?: number; // milliseconds
    sourceInfo?: Partial<A2AEventEnvelope['source_info']>;
  },
): A2AEventEnvelope {
  const now = new Date();
  const envelopeId = crypto.randomUUID();
  const correlationId = options?.correlation?.correlation_id ?? crypto.randomUUID();

  // Determine topic from event type and action
  const topic = getEventTopic(event);

  // Set expiration (default 24 hours)
  const expiresAt = options?.expiresIn
    ? new Date(now.getTime() + options.expiresIn).toISOString()
    : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  return {
    envelope_id: envelopeId,
    envelope_version: '1.0',
    created_at: now.toISOString(),
    expires_at: expiresAt,

    event,

    routing: {
      topic,
      partition_key: getPartitionKey(event),
      routing_key: getRoutingKey(event),
      broadcast: false,
      ...options?.routing,
    },

    priority: options?.priority ?? 'normal',
    delivery_mode: options?.deliveryMode ?? 'at_least_once',
    retry_policy: {
      max_attempts: 3,
      initial_delay_ms: 1000,
      max_delay_ms: 30000,
      backoff_multiplier: 2,
      jitter: true,
      ...options?.retryPolicy,
    },

    correlation: {
      correlation_id: correlationId,
      causation_id: options?.correlation?.causation_id,
      conversation_id: options?.correlation?.conversation_id ?? correlationId,
      session_id: options?.correlation?.session_id,
      trace_id: options?.correlation?.trace_id,
      span_id: options?.correlation?.span_id,
    },

    metadata: {
      version: '1.0',
      schema_version: '1.0',
      content_type: 'application/json',
      encoding: 'utf-8',
      compression: 'none',
      tags: [],
      labels: {},
      ...options?.metadata,
    },

    source_info: {
      service_name: 'github-client',
      service_version: process.env.npm_package_version,
      host_name: process.env.HOSTNAME,
      process_id: process.pid.toString(),
      ...options?.sourceInfo,
    },
  };
}

// Topic Resolution Helper
function getEventTopic(event: GitHubEventData): string {
  switch (event.event_type) {
    case 'github.repository':
      return `github.repository.${event.action}`;
    case 'github.pull_request':
      return `github.pullrequest.${event.action}`;
    case 'github.issue':
      return `github.issue.${event.action}`;
    case 'github.workflow':
      return `github.workflow.${event.action}`;
    case 'github.error':
      return 'github.error';
    default:
      return 'github.unknown';
  }
}

// Partition Key Helper (for event distribution)
function getPartitionKey(event: GitHubEventData): string {
  if ('repository' in event && event.repository) {
    return event.repository.id.toString();
  }
  if ('actor' in event && event.actor) {
    return event.actor.id.toString();
  }
  return 'default';
}

// Routing Key Helper (for targeted delivery)
function getRoutingKey(event: GitHubEventData): string {
  const baseKey = event.event_type.replace('.', '_');
  if ('repository' in event && event.repository) {
    return `${baseKey}.${event.repository.full_name.replace('/', '_')}`;
  }
  return baseKey;
}

// Envelope Helper Functions
export function isExpiredEnvelope(envelope: A2AEventEnvelope): boolean {
  if (!envelope.expires_at) return false;
  return new Date(envelope.expires_at) < new Date();
}

export function getEnvelopeAge(envelope: A2AEventEnvelope): number {
  const created = new Date(envelope.created_at);
  const now = new Date();
  return now.getTime() - created.getTime();
}

export function getEnvelopeTimeToExpiry(envelope: A2AEventEnvelope): number | null {
  if (!envelope.expires_at) return null;
  const expires = new Date(envelope.expires_at);
  const now = new Date();
  return expires.getTime() - now.getTime();
}

export function shouldRetryEnvelope(envelope: A2AEventEnvelope): boolean {
  const state = envelope.processing_state;
  if (!state) return true;

  return (
    state.attempt_count < envelope.retry_policy.max_attempts &&
    !isExpiredEnvelope(envelope) &&
    (envelope.delivery_mode === 'at_least_once' || envelope.delivery_mode === 'exactly_once')
  );
}

export function calculateNextRetryDelay(envelope: A2AEventEnvelope): number {
  const state = envelope.processing_state;
  if (!state) return envelope.retry_policy.initial_delay_ms;

  const { initial_delay_ms, max_delay_ms, backoff_multiplier, jitter } = envelope.retry_policy;

  // Calculate exponential backoff
  let delay = initial_delay_ms * backoff_multiplier ** state.attempt_count;
  delay = Math.min(delay, max_delay_ms);

  // Add jitter if enabled
  if (jitter) {
    const jitterAmount = delay * 0.1 * Math.random();
    delay += jitterAmount;
  }

  return Math.floor(delay);
}

// Envelope Transformation Helpers
export function cloneEnvelope(envelope: A2AEventEnvelope): A2AEventEnvelope {
  return JSON.parse(JSON.stringify(envelope));
}

export function updateProcessingState(
  envelope: A2AEventEnvelope,
  update: Partial<NonNullable<A2AEventEnvelope['processing_state']>>,
): A2AEventEnvelope {
  const clone = cloneEnvelope(envelope);
  clone.processing_state = {
    attempt_count: 0,
    error_count: 0,
    ...clone.processing_state,
    ...update,
  };
  return clone;
}

export function addEnvelopeMetadata(
  envelope: A2AEventEnvelope,
  key: string,
  value: string,
): A2AEventEnvelope {
  const clone = cloneEnvelope(envelope);
  clone.metadata.labels[key] = value;
  return clone;
}

export function addEnvelopeTag(envelope: A2AEventEnvelope, tag: string): A2AEventEnvelope {
  const clone = cloneEnvelope(envelope);
  if (!clone.metadata.tags.includes(tag)) {
    clone.metadata.tags.push(tag);
  }
  return clone;
}

// Envelope Filtering and Querying
export interface EnvelopeFilter {
  eventType?: string[];
  priority?: EventPriority[];
  topics?: string[];
  repositoryIds?: number[];
  actorIds?: number[];
  tags?: string[];
  labels?: Record<string, string>;
  minAge?: number;
  maxAge?: number;
}

export function matchesFilter(envelope: A2AEventEnvelope, filter: EnvelopeFilter): boolean {
  if (filter.eventType && !filter.eventType.includes(envelope.event.event_type)) {
    return false;
  }

  if (filter.priority && !filter.priority.includes(envelope.priority)) {
    return false;
  }

  if (filter.topics && !filter.topics.includes(envelope.routing.topic)) {
    return false;
  }

  if (filter.repositoryIds) {
    const event = envelope.event;
    if ('repository' in event && event.repository) {
      if (!filter.repositoryIds.includes(event.repository.id)) {
        return false;
      }
    } else {
      return false;
    }
  }

  if (filter.actorIds) {
    const event = envelope.event;
    if ('actor' in event && event.actor) {
      if (!filter.actorIds.includes(event.actor.id)) {
        return false;
      }
    } else {
      return false;
    }
  }

  if (filter.tags && filter.tags.length > 0) {
    const hasAllTags = filter.tags.every((tag) => envelope.metadata.tags.includes(tag));
    if (!hasAllTags) {
      return false;
    }
  }

  if (filter.labels) {
    for (const [key, value] of Object.entries(filter.labels)) {
      if (envelope.metadata.labels[key] !== value) {
        return false;
      }
    }
  }

  if (filter.minAge !== undefined || filter.maxAge !== undefined) {
    const age = getEnvelopeAge(envelope);
    if (filter.minAge !== undefined && age < filter.minAge) {
      return false;
    }
    if (filter.maxAge !== undefined && age > filter.maxAge) {
      return false;
    }
  }

  return true;
}

// Batch Operations
export function createBatchEnvelope(
  events: GitHubEventData[],
  options?: Parameters<typeof createA2AEventEnvelope>[1],
): A2AEventEnvelope[] {
  return events.map((event) => createA2AEventEnvelope(event, options));
}

export function filterEnvelopes(
  envelopes: A2AEventEnvelope[],
  filter: EnvelopeFilter,
): A2AEventEnvelope[] {
  return envelopes.filter((envelope) => matchesFilter(envelope, filter));
}

export function sortEnvelopesByPriority(envelopes: A2AEventEnvelope[]): A2AEventEnvelope[] {
  const priorityOrder: Record<EventPriority, number> = {
    critical: 4,
    high: 3,
    normal: 2,
    low: 1,
  };

  return [...envelopes].sort((a, b) => {
    const aPriority = priorityOrder[a.priority];
    const bPriority = priorityOrder[b.priority];
    if (aPriority !== bPriority) {
      return bPriority - aPriority; // Higher priority first
    }
    // Secondary sort by creation time
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}
