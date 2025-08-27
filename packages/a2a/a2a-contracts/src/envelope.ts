import { z } from 'zod';

/**
 * CloudEvents 1.0 compliant envelope extending ASBR requirements
 * See: https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md
 */
export const Envelope = z
  .object({
    // CloudEvents 1.0 Required Attributes
    id: z.string().min(1).describe('Unique identifier for this event'),
    type: z.string().min(1).describe('Event type identifier'),
    source: z.string().url().describe('Source URI of the event producer'),
    specversion: z.literal('1.0').describe('CloudEvents specification version'),

    // CloudEvents 1.0 Optional Attributes
    datacontenttype: z.string().optional().describe('Content type of the data payload'),
    dataschema: z.string().url().optional().describe('Schema URI for the data payload'),
    subject: z.string().optional().describe('Subject of the event'),
    time: z.string().datetime().optional().describe('Timestamp of when the event occurred'),

    // ASBR Extensions (maintaining backward compatibility)
    schemaVersion: z.number().int().positive().default(1).describe('ASBR schema version'),
    causationId: z.string().uuid().optional().describe('ID of the event that caused this event'),
    correlationId: z.string().uuid().optional().describe('Correlation ID for related events'),
    occurredAt: z.string().datetime().optional().describe('When this event occurred (ASBR format)'),
    ttlMs: z.number().int().positive().default(60000).describe('Time-to-live in milliseconds'),
    headers: z.record(z.string()).default({}).describe('Additional headers/metadata'),

    // W3C Trace Context headers for distributed tracing
    traceparent: z.string().optional().describe('W3C Trace Context traceparent header'),
    tracestate: z.string().optional().describe('W3C Trace Context tracestate header'),
    baggage: z.string().optional().describe('W3C Baggage header for trace context propagation'),

    // Event payload
    data: z.unknown().optional().describe('Event payload data'),
    payload: z.unknown().optional().describe('Legacy payload field for backward compatibility'),
  })
  .refine(
    (env) => {
      // Ensure either 'data' or 'payload' is present for backward compatibility
      return env.data !== undefined || env.payload !== undefined;
    },
    {
      message: "Either 'data' or 'payload' must be provided",
    },
  )
  .transform((env) => ({
    ...env,
    // For backward compatibility, if only 'data' is present, copy to 'payload'
    payload: env.payload !== undefined ? env.payload : env.data,
    // If time is not set but occurredAt is, use occurredAt for time
    time: env.time || env.occurredAt || new Date().toISOString(),
  }));

export type Envelope = z.infer<typeof Envelope>;

/**
 * Helper function to create CloudEvents compliant envelopes
 */
export function createEnvelope(params: {
  id?: string;
  type: string;
  source: string;
  data: unknown;
  subject?: string;
  causationId?: string;
  correlationId?: string;
  ttlMs?: number;
  headers?: Record<string, string>;
  datacontenttype?: string;
  dataschema?: string;
  traceparent?: string;
  tracestate?: string;
  baggage?: string;
}): Envelope {
  const now = new Date().toISOString();

  return Envelope.parse({
    id: params.id || crypto.randomUUID(),
    type: params.type,
    source: params.source,
    specversion: '1.0',
    data: params.data,
    subject: params.subject,
    causationId: params.causationId,
    correlationId: params.correlationId,
    ttlMs: params.ttlMs || 60000,
    headers: params.headers || {},
    datacontenttype: params.datacontenttype,
    dataschema: params.dataschema,
    traceparent: params.traceparent,
    tracestate: params.tracestate,
    baggage: params.baggage,
    time: now,
    occurredAt: now,
  });
}

/**
 * Helper function to convert legacy envelopes to CloudEvents format
 */
export function migrateLegacyEnvelope(legacy: {
  id: string;
  type: string;
  schemaVersion?: number;
  causationId?: string;
  correlationId?: string;
  occurredAt: string;
  ttlMs?: number;
  headers?: Record<string, string>;
  payload: unknown;
}): Envelope {
  return createEnvelope({
    id: legacy.id,
    type: legacy.type,
    source: '/legacy/a2a', // Default source for migrated envelopes
    data: legacy.payload,
    causationId: legacy.causationId,
    correlationId: legacy.correlationId,
    ttlMs: legacy.ttlMs,
    headers: {
      ...legacy.headers,
      'asbr-schema-version': (legacy.schemaVersion || 1).toString(),
      migrated: 'true',
    },
  });
}
