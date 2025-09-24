import { z } from 'zod';

export const proofIndexedEventSchema = z.object({
	specversion: z.literal('1.0'),
	type: z.literal('proof.indexed'),
	source: z.literal('urn:cortex:kernel:proof'),
	id: z.string(),
	time: z.string(),
	data: z.object({
		proofId: z.string(),
		digestAlgo: z.enum(['fnv1a32', 'sha256']),
		signerId: z.string().optional(),
	}),
	related: z.object({
		generatedEventId: z.string(),
	}),
});

export type ProofIndexedEventContract = z.infer<typeof proofIndexedEventSchema>;
