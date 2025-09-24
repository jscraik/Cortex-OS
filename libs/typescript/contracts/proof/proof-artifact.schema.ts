import { z } from 'zod';

// Namespaced claim keys (core.* reserved for system)
export const proofArtifactClaimKey = z.string().regex(/^[a-z0-9]+\.[a-zA-Z0-9_-]+$/);
export const proofArtifactClaimsSchema = z.record(proofArtifactClaimKey, z.string());

export const proofArtifactDigestSchema = z.object({
	algo: z.enum(['fnv1a32', 'sha256']),
	value: z.string(),
	length: z.number().int().positive(),
});

export const proofArtifactSchema = z.object({
	id: z.string().startsWith('proof_'),
	version: z.literal('1.0.0'),
	seed: z.string(),
	executionHash: z.string(),
	claims: proofArtifactClaimsSchema,
	digest: proofArtifactDigestSchema,
	timestamp: z.number().int(),
	records: z.array(
		z.object({
			id: z.string(),
			success: z.boolean(),
			value: z.unknown().optional(),
			error: z.string().optional(),
		}),
	),
	signature: z.string().optional(),
	signerId: z.string().optional(),
});

export type ProofArtifactContract = z.infer<typeof proofArtifactSchema>;

// v1.1.0 extends 1.0.0 with optional meta object (additive, backward-compatible)
export const proofArtifactV110Schema = proofArtifactSchema.extend({
	version: z.literal('1.1.0'),
	meta: z
		.object({
			notes: z.string().max(500).optional(),
			tags: z.array(z.string()).max(20).optional(),
		})
		.optional(),
});

export const proofArtifactAnyVersionSchema = z.union([
	proofArtifactSchema,
	proofArtifactV110Schema,
]);

export type ProofArtifactAnyVersion = z.infer<typeof proofArtifactAnyVersionSchema>;
