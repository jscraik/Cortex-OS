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

const sha256Regex = /^[0-9a-f]{64}$/;

const proofEvidenceFileSchema = z
	.object({
		type: z.literal('file'),
		path: z.string(),
		blobSha256: z.string().regex(sha256Regex),
		commit: z.string().optional(),
		lines: z
			.object({
				start: z.number().int().min(1),
				end: z.number().int().min(1),
			})
			.optional(),
		quote: z.string().optional(),
		quoteSha256: z.string().regex(sha256Regex).optional(),
	})
	.strict();

const proofEvidenceUrlSchema = z
	.object({
		type: z.literal('url'),
		href: z.string().url(),
		selector: z.string().optional(),
		snapshot: z
			.object({
				bodySha256: z.string().regex(sha256Regex),
				retrievedAt: z.string().datetime(),
			})
			.optional(),
		quote: z.string().optional(),
		quoteSha256: z.string().regex(sha256Regex).optional(),
	})
	.strict();

export const proofEnvelopeV020Schema = z
	.object({
		proofSpec: z.literal('cortex-os/proof-artifact'),
		specVersion: z.literal('0.2.0'),
		id: z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/),
		issuedAt: z.string().datetime(),
		actor: z
			.object({
				agent: z.string(),
				role: z.string(),
				runId: z.string().optional(),
			})
			.strict(),
		artifact: z
			.object({
				uri: z.string().url(),
				mime: z.string(),
				contentHash: z
					.object({
						alg: z.literal('sha256'),
						hex: z.string().regex(sha256Regex),
					})
					.strict(),
			})
			.strict(),
		bundle: z
			.object({
				files: z.array(
					z
						.object({
							uri: z.string().url(),
							sha256: z.string().regex(sha256Regex),
						})
						.strict(),
				),
				merkleRoot: z.string().regex(sha256Regex).optional(),
			})
			.strict()
			.optional(),
		context: z
			.object({
				public: z.record(z.string(), z.unknown()),
				sealedRef: z
					.object({
						uri: z.string().url(),
						sha256: z.string().regex(sha256Regex),
					})
					.strict()
					.optional(),
			})
			.strict(),
		evidence: z.array(z.union([proofEvidenceFileSchema, proofEvidenceUrlSchema])),
		runtime: z
			.object({
				model: z.string(),
				parameters: z.record(z.string(), z.unknown()).optional(),
				tooling: z.record(z.string(), z.string()).optional(),
			})
			.strict(),
		trace: z
			.object({
				otel: z
					.object({
						traceId: z.string().regex(/^[0-9a-f]{32}$/),
						rootSpanId: z
							.string()
							.regex(/^[0-9a-f]{16}$/)
							.optional(),
					})
					.strict(),
			})
			.strict()
			.optional(),
		policyReceipts: z
			.array(
				z
					.object({
						name: z.string(),
						status: z.enum(['pass', 'fail', 'warn']),
						checks: z.array(z.string()).optional(),
						sbom: z.string().optional(),
					})
					.strict(),
			)
			.optional(),
		attestations: z
			.array(
				z
					.object({
						type: z.literal('in-toto'),
						predicateType: z.string().url(),
						statement: z.string(),
						signing: z
							.object({
								method: z.literal('sigstore-cosign'),
								issuer: z.string(),
							})
							.strict(),
					})
					.strict(),
			)
			.optional(),
	})
	.strict();

export type ProofEnvelopeV020 = z.infer<typeof proofEnvelopeV020Schema>;

export const proofEnvelopeUnionSchema = z.union([proofEnvelopeV020Schema]);

export type ProofEnvelopeAnyVersion = z.infer<typeof proofEnvelopeUnionSchema>;
