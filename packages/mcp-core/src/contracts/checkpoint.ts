import { z } from 'zod';

export type CheckpointId = string;
export type BranchId = string;

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
        id: CheckpointIdSchema,
        parent: CheckpointIdSchema.optional(),
        branch: BranchIdSchema.optional(),
        createdAt: z.string().datetime({ offset: true }),
        score: z.number().optional(),
        labels: z.array(z.string()).optional(),
        sizeBytes: z.number().int().nonnegative().optional(),
});
export type CheckpointMeta = z.infer<typeof CheckpointMetaSchema> & {
        id: CheckpointId;
        parent?: CheckpointId;
        branch?: BranchId;
};

export const CheckpointRecordSchema = z.object({
        meta: CheckpointMetaSchema,
        state: StateEnvelopeSchema,
});
export type CheckpointRecord = {
        meta: CheckpointMeta;
        state: StateEnvelope;
};

export const CheckpointBranchRequestSchema = z.object({
        from: CheckpointIdSchema,
        count: z.number().int().positive().max(10),
        labels: z.array(z.string()).optional(),
});
export type CheckpointBranchRequest = z.infer<typeof CheckpointBranchRequestSchema> & {
        from: CheckpointId;
};

export const CheckpointListPageSchema = z.object({
        items: z.array(CheckpointRecordSchema),
        total: z.number().int().nonnegative(),
        nextCursor: z.string().optional(),
});
export type CheckpointListPage = z.infer<typeof CheckpointListPageSchema> & {
        items: CheckpointRecord[];
};

export const CheckpointSnapshotSchema = CheckpointRecordSchema.extend({
        branchId: BranchIdSchema.optional(),
});
export type CheckpointSnapshot = CheckpointRecord & { branchId?: BranchId };

export const CheckpointContextSchema = z.object({
        meta: CheckpointMetaSchema,
        state: StateEnvelopeSchema,
        related: z.array(CheckpointMetaSchema).optional(),
});
export type CheckpointContext = z.infer<typeof CheckpointContextSchema> & {
        meta: CheckpointMeta;
        related?: CheckpointMeta[];
};
