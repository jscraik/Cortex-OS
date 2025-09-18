import { z } from 'zod';

// Simplified Envelope schema for testing purposes
const SimplifiedEnvelope = z.object({
	id: z.string(),
	type: z.string(),
	source: z.string(),
	specversion: z.string(),
	data: z.unknown().optional(),
});

export const OutboxMessageStatus = z.enum(['pending', 'sent', 'failed', 'poisoned']);

export const OutboxMessage = SimplifiedEnvelope.extend({
	status: OutboxMessageStatus,
});

export type OutboxMessage = z.infer<typeof OutboxMessage>;
