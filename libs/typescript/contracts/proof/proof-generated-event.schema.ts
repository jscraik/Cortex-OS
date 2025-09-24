import { z } from 'zod';
import { proofArtifactDigestSchema } from './proof-artifact.schema.js';

export const proofGeneratedEventSchema = z.object({
	specversion: z.literal('1.0'),
	type: z.literal('proof.generated'),
	source: z.literal('urn:cortex:kernel:proof'),
	id: z.string().startsWith('proof_'),
	time: z.string(),
	data: z.object({
		artifact: z.object({
			id: z.string().startsWith('proof_'),
			version: z.literal('1.0.0'),
			seed: z.string(),
			executionHash: z.string(),
			claims: z.record(z.string()),
			digest: proofArtifactDigestSchema,
			timestamp: z.number().int(),
			signature: z.string().optional(),
			signerId: z.string().optional(),
			recordCount: z.number().int().nonnegative(),
		}),
	}),
});

export type ProofGeneratedEventContract = z.infer<typeof proofGeneratedEventSchema>;
