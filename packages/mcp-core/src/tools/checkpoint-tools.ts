import { randomUUID } from 'node:crypto';
import {
	CheckpointIdSchema,
	CheckpointMetaSchema,
	CheckpointRecordSchema,
	StateEnvelopeSchema,
} from '@cortex-os/contracts';
import {
	type CheckpointBranchRequest,
	type CheckpointContext,
	type CheckpointListPage,
	type CheckpointManager,
	type CheckpointSnapshot,
	createMemoryProviderFromEnv,
} from '@cortex-os/memory-core';
import { z } from 'zod';
import type { McpTool } from '../tools.js';
import { McpToolError } from '../tools.js';

type Manager = CheckpointManager;

let managerCache: Manager | null = null;

function ensureManager(): Manager {
	if (managerCache) {
		return managerCache;
	}

	const provider = createMemoryProviderFromEnv();

	if (!provider.checkpoints) {
		throw new McpToolError('Checkpoint manager is not available for this provider', {
			code: 'E_CHECKPOINT_UNSUPPORTED',
		});
	}

	managerCache = provider.checkpoints;
	return managerCache;
}

const CheckpointSaveInputSchema = z.object({
	record: z.object({
		meta: CheckpointMetaSchema.partial({ id: true, createdAt: true }).optional(),
		state: StateEnvelopeSchema,
	}),
});

type CheckpointSaveInput = z.infer<typeof CheckpointSaveInputSchema>;

type CheckpointSaveResult = {
	id: string;
	createdAt: string;
};

export const checkpointSaveTool: McpTool<CheckpointSaveInput, CheckpointSaveResult> = {
	name: 'checkpoint.save',
	description: 'Persist a checkpoint state into the Cortex-OS memory core.',
	inputSchema: CheckpointSaveInputSchema,
	async execute({ record }): Promise<CheckpointSaveResult> {
		const manager = ensureManager();
		const metaInput = record.meta ?? {};
		const normalized = {
			meta: {
				...metaInput,
				id: metaInput.id ?? `ckpt_${randomUUID()}`,
				createdAt: metaInput.createdAt ?? new Date().toISOString(),
			},
			state: record.state,
		};
		const parsed = CheckpointRecordSchema.parse(normalized);
		const result = await manager.save(parsed);
		return {
			id: result.meta.id,
			createdAt: result.meta.createdAt,
		};
	},
};

const CheckpointLoadInputSchema = z.object({
	id: CheckpointIdSchema,
});

type CheckpointLoadInput = z.infer<typeof CheckpointLoadInputSchema>;

export const checkpointLoadTool: McpTool<CheckpointLoadInput, CheckpointContext> = {
	name: 'checkpoint.load',
	description: 'Load a previously saved checkpoint state.',
	inputSchema: CheckpointLoadInputSchema,
	async execute({ id }): Promise<CheckpointContext> {
		const manager = ensureManager();
		const result = await manager.context(id);
		if (!result) {
			throw new McpToolError(`Checkpoint ${id} was not found`, {
				code: 'E_CHECKPOINT_NOT_FOUND',
			});
		}
		return result;
	},
};

const CheckpointListInputSchema = z.object({
	limit: z.number().int().positive().max(100).default(20).optional(),
	cursor: z.string().optional(),
});

type CheckpointListInput = z.infer<typeof CheckpointListInputSchema>;

export const checkpointListTool: McpTool<CheckpointListInput, CheckpointListPage> = {
	name: 'checkpoint.list',
	description: 'List stored checkpoints with optional cursor-based pagination.',
	inputSchema: CheckpointListInputSchema,
	async execute({ limit, cursor }): Promise<CheckpointListPage> {
		const manager = ensureManager();
		return manager.list(limit ?? 20, cursor);
	},
};

const CheckpointRollbackInputSchema = z.object({
	id: CheckpointIdSchema,
});

type CheckpointRollbackInput = z.infer<typeof CheckpointRollbackInputSchema>;

export const checkpointRollbackTool: McpTool<CheckpointRollbackInput, CheckpointSnapshot> = {
	name: 'checkpoint.rollback',
	description: 'Load checkpoint state to support rollback scenarios.',
	inputSchema: CheckpointRollbackInputSchema,
	async execute({ id }): Promise<CheckpointSnapshot> {
		const manager = ensureManager();
		const snapshot = await manager.snapshot(id);
		if (!snapshot) {
			throw new McpToolError(`Checkpoint ${id} was not found`, {
				code: 'E_CHECKPOINT_NOT_FOUND',
			});
		}
		return snapshot;
	},
};

const CheckpointBranchInputSchema = z.object({
	from: CheckpointIdSchema,
	count: z.number().int().positive().max(10).default(1),
	labels: z.array(z.string()).optional(),
});

type CheckpointBranchInput = z.infer<typeof CheckpointBranchInputSchema>;

type CheckpointBranchResult = {
	branchId: string;
	checkpoints: string[];
};

export const checkpointBranchTool: McpTool<CheckpointBranchInput, CheckpointBranchResult> = {
	name: 'checkpoint.branch',
	description: 'Create one or more derivative checkpoints from an existing checkpoint.',
	inputSchema: CheckpointBranchInputSchema,
	async execute({ from, count, labels }): Promise<CheckpointBranchResult> {
		const manager = ensureManager();
		const branchRequest: CheckpointBranchRequest = {
			from,
			count,
			labels,
		};
		const result = await manager.branch(branchRequest);
		return {
			branchId: result.branchId,
			checkpoints: result.checkpoints,
		};
	},
};

export const checkpointPruneTool: McpTool<Record<string, never>, { deleted: number }> = {
	name: 'checkpoint.prune',
	description: 'Trigger pruning of expired checkpoints according to policy.',
	inputSchema: z.object({}).strict(),
	async execute(): Promise<{ deleted: number }> {
		const manager = ensureManager();
		const deleted = await manager.prune();
		return { deleted };
	},
};
