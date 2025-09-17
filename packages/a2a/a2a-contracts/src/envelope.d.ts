import { type EvidenceArray } from '@cortex-os/contracts';
import { z } from 'zod';
export declare const Envelope: z.ZodEffects<
	z.ZodObject<
		{
			id: z.ZodString;
			type: z.ZodString;
			source: z.ZodEffects<z.ZodString, string, string>;
			specversion: z.ZodLiteral<'1.0'>;
			datacontenttype: z.ZodOptional<z.ZodString>;
			dataschema: z.ZodOptional<z.ZodString>;
			subject: z.ZodOptional<z.ZodString>;
			time: z.ZodOptional<z.ZodString>;
			causationId: z.ZodOptional<z.ZodString>;
			correlationId: z.ZodOptional<z.ZodString>;
			ttlMs: z.ZodDefault<z.ZodNumber>;
			headers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
			traceparent: z.ZodOptional<z.ZodString>;
			tracestate: z.ZodOptional<z.ZodString>;
			baggage: z.ZodOptional<z.ZodString>;
			data: z.ZodOptional<z.ZodUnknown>;
		},
		'strip',
		z.ZodTypeAny,
		{
			type: string;
			id: string;
			source: string;
			specversion: '1.0';
			ttlMs: number;
			headers: Record<string, string>;
			data?: unknown;
			subject?: string | undefined;
			datacontenttype?: string | undefined;
			dataschema?: string | undefined;
			time?: string | undefined;
			causationId?: string | undefined;
			correlationId?: string | undefined;
			traceparent?: string | undefined;
			tracestate?: string | undefined;
			baggage?: string | undefined;
		},
		{
			type: string;
			id: string;
			source: string;
			specversion: '1.0';
			data?: unknown;
			subject?: string | undefined;
			datacontenttype?: string | undefined;
			dataschema?: string | undefined;
			time?: string | undefined;
			causationId?: string | undefined;
			correlationId?: string | undefined;
			ttlMs?: number | undefined;
			headers?: Record<string, string> | undefined;
			traceparent?: string | undefined;
			tracestate?: string | undefined;
			baggage?: string | undefined;
		}
	>,
	{
		time: string;
		type: string;
		id: string;
		source: string;
		specversion: '1.0';
		ttlMs: number;
		headers: Record<string, string>;
		data?: unknown;
		subject?: string | undefined;
		datacontenttype?: string | undefined;
		dataschema?: string | undefined;
		causationId?: string | undefined;
		correlationId?: string | undefined;
		traceparent?: string | undefined;
		tracestate?: string | undefined;
		baggage?: string | undefined;
	},
	{
		type: string;
		id: string;
		source: string;
		specversion: '1.0';
		data?: unknown;
		subject?: string | undefined;
		datacontenttype?: string | undefined;
		dataschema?: string | undefined;
		time?: string | undefined;
		causationId?: string | undefined;
		correlationId?: string | undefined;
		ttlMs?: number | undefined;
		headers?: Record<string, string> | undefined;
		traceparent?: string | undefined;
		tracestate?: string | undefined;
		baggage?: string | undefined;
	}
>;
export type Envelope = z.infer<typeof Envelope>;
/**
 * Helper function to create CloudEvents compliant envelopes
 */
export declare function createEnvelope(params: {
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
}): Envelope;
/**
 * Non-mutating helper that returns a new envelope with validated evidence attached under data.evidence.
 * If the existing envelope already has data.evidence it will be replaced.
 */
export declare function withEvidence<T extends z.infer<typeof Envelope>>(
	envelope: T,
	evidence: EvidenceArray,
): T & {
	data: Record<string, unknown> & {
		evidence: EvidenceArray;
	};
};
//# sourceMappingURL=envelope.d.ts.map
