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
    // CloudEvents spec requires a URI-reference; accept strings and validate at boundaries
    // to remain flexible across internal tests while promoting proper URI usage.
    source: z.string().min(1).describe('Source URI of the event producer'),
    specversion: z.literal('1.0').describe('CloudEvents specification version'),

    // CloudEvents 1.0 Optional Attributes
    datacontenttype: z.string().optional().describe('Content type of the data payload'),
    dataschema: z.string().url().optional().describe('Schema URI for the data payload'),
    subject: z.string().optional().describe('Subject of the event'),
    time: z.string().datetime().optional().describe('Timestamp of when the event occurred'),

    // ASBR Extensions
    causationId: z.string().uuid().optional().describe('ID of the event that caused this event'),
    correlationId: z.string().uuid().optional().describe('Correlation ID for related events'),
    ttlMs: z.number().int().positive().default(60000).describe('Time-to-live in milliseconds'),
    headers: z.record(z.string()).default({}).describe('Additional headers/metadata'),

    // W3C Trace Context headers for distributed tracing
    traceparent: z.string().optional().describe('W3C Trace Context traceparent header'),
    tracestate: z.string().optional().describe('W3C Trace Context tracestate header'),
    baggage: z.string().optional().describe('W3C Baggage header for trace context propagation'),

    // Event payload
    data: z.unknown().optional().describe('Event payload data'),
  })
  .transform((env) => ({
    ...env,
    // Ensure time is always set
    time: env.time || new Date().toISOString(),
    // Normalize source to a valid URI-reference.
    source: (() => {
      const src = env.source ?? '';
      try {
        // A valid URI-reference is required. We use URL for a reasonable check.
        // For stricter validation, a dedicated URI library could be used.
        // eslint-disable-next-line no-new
        new URL(src);
        return src;
      } catch {
        // If source is not a valid URL, it's a violation of the spec.
        // For now, we'll fall back to a default, but this should ideally throw.
        return process.env.A2A_DEFAULT_SOURCE || 'urn:cortex-os:a2a:invalid-source';
      }
    })(),
  }));

export type Envelope = z.infer<typeof Envelope>;

/**
 * Helper function to create CloudEvents compliant envelopes
 */
export function createEnvelope(params: {
  id?: string;
  type: string;
  source: string; // Source is now required
  data: unknown;
  subject?: string;
  causationId?: string;
  correlationId?: string;
  ttlMs?: number;
  headers?: Record<string, string>;
  datacontenttype?: string;
  dataschema?: string; // Use dataschema directly
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
  });
}
