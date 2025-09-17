import { createTool, z } from '../mocks/voltagent-core';

export const createMemoryDeleteTool = () =>
	createTool({
		id: 'memory-delete',
		name: 'memory_delete',
		description: 'Delete memories from the agent memory system',

		parameters: z.object({
			memoryId: z.string().min(1),
			confirm: z.boolean().optional().default(false),
		}),

		async execute(params, _context) {
			return {
				success: true,
				memoryId: params.memoryId,
				deleted: true,
				timestamp: new Date().toISOString(),
			};
		},
	});
