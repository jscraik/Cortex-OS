import { z } from 'zod';
import {
        BranchIdSchema,
        CheckpointIdSchema,
        CheckpointMetaSchema,
} from '@cortex-os/contracts';

const SourceSchema = z.literal('memory-core');
const TimestampSchema = z.string().datetime();

export const CheckpointSavedEventSchema = z.object({
        event_id: z.string().uuid(),
        event_type: z.literal('cortex.checkpoint.saved'),
        source: SourceSchema,
        timestamp: TimestampSchema,
        checkpoint: CheckpointMetaSchema,
        digest: z.string(),
});
export type CheckpointSavedEvent = z.infer<typeof CheckpointSavedEventSchema>;

export const CheckpointRolledBackEventSchema = z.object({
        event_id: z.string().uuid(),
        event_type: z.literal('cortex.checkpoint.rolled_back'),
        source: SourceSchema,
        timestamp: TimestampSchema,
        from: CheckpointIdSchema,
        to: CheckpointIdSchema,
});
export type CheckpointRolledBackEvent = z.infer<typeof CheckpointRolledBackEventSchema>;

export const CheckpointPrunedEventSchema = z.object({
        event_id: z.string().uuid(),
        event_type: z.literal('cortex.checkpoint.pruned'),
        source: SourceSchema,
        timestamp: TimestampSchema,
        deleted: z.number().int().nonnegative(),
});
export type CheckpointPrunedEvent = z.infer<typeof CheckpointPrunedEventSchema>;

export const CheckpointBranchStartedEventSchema = z.object({
        event_id: z.string().uuid(),
        event_type: z.literal('cortex.checkpoint.branch.started'),
        source: SourceSchema,
        timestamp: TimestampSchema,
        parent: CheckpointIdSchema,
        branch: BranchIdSchema,
        requested: z.number().int().positive(),
});
export type CheckpointBranchStartedEvent = z.infer<
        typeof CheckpointBranchStartedEventSchema
>;

export const CheckpointBranchCompletedEventSchema = z.object({
        event_id: z.string().uuid(),
        event_type: z.literal('cortex.checkpoint.branch.completed'),
        source: SourceSchema,
        timestamp: TimestampSchema,
        branch: BranchIdSchema,
        checkpointIds: z.array(CheckpointIdSchema),
        status: z.enum(['ok', 'failed']).default('ok'),
});
export type CheckpointBranchCompletedEvent = z.infer<
        typeof CheckpointBranchCompletedEventSchema
>;

export function validateCheckpointSavedEvent(data: unknown): CheckpointSavedEvent {
        return CheckpointSavedEventSchema.parse(data);
}

export function validateCheckpointRolledBackEvent(
        data: unknown,
): CheckpointRolledBackEvent {
        return CheckpointRolledBackEventSchema.parse(data);
}

export function validateCheckpointPrunedEvent(data: unknown): CheckpointPrunedEvent {
        return CheckpointPrunedEventSchema.parse(data);
}

export function validateCheckpointBranchStartedEvent(
        data: unknown,
): CheckpointBranchStartedEvent {
        return CheckpointBranchStartedEventSchema.parse(data);
}

export function validateCheckpointBranchCompletedEvent(
        data: unknown,
): CheckpointBranchCompletedEvent {
        return CheckpointBranchCompletedEventSchema.parse(data);
}
