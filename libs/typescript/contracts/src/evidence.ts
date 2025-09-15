import { z } from 'zod';

/**
 * Evidence item representing a citation supporting an LLM claim or agent action.
 * At least one of `text` or `uri` must be provided. When both are present, `text`
 * is considered an extracted snippet from the canonical `uri` source.
 */
export const evidenceItemSchema = z
	.object({
		id: z.string().min(1).optional().describe('Stable identifier if available'),
		kind: z
			.enum(['document', 'code', 'web', 'memory', 'log', 'other'])
			.default('document')
			.describe('Source classification'),
		text: z.string().min(1).optional().describe('Inline snippet content'),
		uri: z
			.string()
			.url()
			.optional()
			.describe('Canonical resolvable source URI'),
		startOffset: z
			.number()
			.int()
			.nonnegative()
			.optional()
			.describe('Start byte/char offset within source'),
		endOffset: z
			.number()
			.int()
			.positive()
			.optional()
			.describe('Exclusive end byte/char offset within source'),
		score: z
			.number()
			.min(0)
			.max(1)
			.optional()
			.describe('Relevance/confidence score (normalized 0-1)'),
		metadata: z
			.record(z.unknown())
			.optional()
			.describe(
				'Arbitrary structured metadata (validated by downstream contracts)',
			),
		hash: z
			.string()
			.length(64)
			.optional()
			.describe('Content hash (e.g., sha256 hex) for integrity'),
		timestamp: z
			.string()
			.datetime()
			.optional()
			.describe('Timestamp when evidence was captured'),
	})
	.superRefine((val, ctx) => {
		if (!val.text && !val.uri) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Evidence item must include at least one of text or uri',
			});
		}
		if (val.startOffset !== undefined) {
			if (val.endOffset === undefined) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'endOffset required when startOffset is provided',
				});
			} else if (val.endOffset <= val.startOffset) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'endOffset must be greater than startOffset',
				});
			}
		}
	});

/**
 * Array of evidence items with an upper bound to prevent unbounded event size
 * and downstream memory pressure.
 */
export const evidenceArraySchema = z
	.array(evidenceItemSchema)
	.max(50, 'Evidence array exceeds maximum size of 50 items');

export type EvidenceItem = z.infer<typeof evidenceItemSchema>;
export type EvidenceArray = z.infer<typeof evidenceArraySchema>;
