import { createTool } from '@voltagent/core';
import { z } from 'zod';

export const createMemoryDeleteTool = () =>
	createTool({
		id: 'memory-delete',
		name: 'memory_delete',
		description: 'Delete memories from the agent memory system',

		parameters: z.object({
			memoryId: z.string().min(1),
			confirm: z.boolean().optional().default(false),
		}),

		async execute(
			params: { memoryId: string; confirm?: boolean },
			_context: unknown,
		) {
			return {
				success: true,
				memoryId: params.memoryId,
				deleted: true,
				timestamp: new Date().toISOString(),
			};
		},
	});
