import { z } from 'zod';

export type CheckpointId = `ckpt_${string}`;
export type BranchId = `branch_${string}`;

export const CheckpointIdSchema = z
	.string()
	.regex(/^ckpt_[0-9a-zA-Z_-]+$/u, 'Checkpoint ids must be prefixed with ckpt_');

export const BranchIdSchema = z
	.string()
	.regex(/^branch_[0-9a-zA-Z_-]+$/u, 'Branch ids must be prefixed with branch_');

export const EvidenceRefSchema = z.object({
	uri: z
		.string()
		.refine(
			(uri) =>
				uri.startsWith('file://') ||
				uri.startsWith('db://') ||
				uri.startsWith('s3://') ||
				uri.startsWith('http://') ||
				uri.startsWith('https://'),
			{ message: 'Unsupported evidence URI scheme' },
		),
	digest: z
		.string()
		.regex(/^(sha256|blake3):[0-9a-f]{16,}$/u, 'Digest must include algorithm prefix')
		.optional(),
	mediaType: z.string().optional(),
});
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

export const StateEnvelopeSchema = z.object({
	plan: z.unknown(),
	worldModel: z.unknown().optional(),
	toolCtx: z.record(z.unknown()).optional(),
	scratch: z.record(z.unknown()).optional(),
	memRefs: z.array(z.string()).optional(),
	rngSeed: z.number().int().optional(),
	evidence: z.array(EvidenceRefSchema).optional(),
});
export type StateEnvelope = z.infer<typeof StateEnvelopeSchema>;

export const CheckpointMetaSchema = z.object({
	id: CheckpointIdSchema.transform((value) => value as CheckpointId),
	parent: CheckpointIdSchema.transform((value) => value as CheckpointId).optional(),
	branch: BranchIdSchema.transform((value) => value as BranchId).optional(),
	createdAt: z.string().datetime({ offset: true }),
	score: z.number().optional(),
	labels: z.array(z.string()).optional(),
	sizeBytes: z.number().int().nonnegative().optional(),
});
export type CheckpointMeta = z.infer<typeof CheckpointMetaSchema>;

export const CheckpointRecordSchema = z.object({
	meta: CheckpointMetaSchema,
	state: StateEnvelopeSchema,
});
export type CheckpointRecord = z.infer<typeof CheckpointRecordSchema>;
