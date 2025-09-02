import { z } from "zod";

/**
 * CloudEvents 1.0 compliant envelope extending ASBR requirements
 * See: https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md
 */
export const Envelope = z
	.object({
		// CloudEvents 1.0 Required Attributes
		id: z.string().min(1).describe("Unique identifier for this event"),
		type: z.string().min(1).describe("Event type identifier"),
		// CloudEvents spec requires a URI-reference; enforce valid URI usage.
		source: z
			.string()
			.min(1)
			.refine(
				(src) => {
					try {
						new URL(src);
						return true;
					} catch {
						return false;
					}
				},
				{ message: "Source must be a valid URI" },
			)
			.describe("Source URI of the event producer"),
		specversion: z.literal("1.0").describe("CloudEvents specification version"),

		// CloudEvents 1.0 Optional Attributes
		datacontenttype: z
			.string()
			.optional()
			.describe("Content type of the data payload"),
		dataschema: z
			.string()
			.url()
			.optional()
			.describe("Schema URI for the data payload"),
		subject: z.string().optional().describe("Subject of the event"),
		time: z
			.string()
			.datetime()
			.optional()
			.describe("Timestamp of when the event occurred"),

		// ASBR Extensions
		causationId: z
			.string()
			.uuid()
			.optional()
			.describe("ID of the event that caused this event"),
		correlationId: z
			.string()
			.uuid()
			.optional()
			.describe("Correlation ID for related events"),
		ttlMs: z
			.number()
			.int()
			.positive()
			.default(60000)
			.describe("Time-to-live in milliseconds"),
		headers: z
			.record(z.string())
			.default({})
			.describe("Additional headers/metadata"),

		// W3C Trace Context headers for distributed tracing
		traceparent: z
			.string()
			.optional()
			.describe("W3C Trace Context traceparent header"),
		tracestate: z
			.string()
			.optional()
			.describe("W3C Trace Context tracestate header"),
		baggage: z
			.string()
			.optional()
			.describe("W3C Baggage header for trace context propagation"),

		// Event payload
		data: z.unknown().optional().describe("Event payload data"),
	})
	.transform((env) => ({
		...env,
		// Ensure time is always set
		time: env.time || new Date().toISOString(),
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
		specversion: "1.0",
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
