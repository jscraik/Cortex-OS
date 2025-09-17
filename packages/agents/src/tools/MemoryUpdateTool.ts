import { createTool, z } from '../mocks/voltagent-core';

export const createMemoryUpdateTool = () =>
	createTool({
		id: 'memory-update',
		name: 'memory_update',
		description: 'Update existing memories with new content, tags, or metadata',

		parameters: z.object({
			memoryId: z.string().min(1),
			content: z.string().optional(),
			type: z
				.enum([
					'working',
					'contextual',
					'episodic',
					'semantic',
					'procedural',
					'declarative',
				])
				.optional(),
			addTags: z.array(z.string()).optional(),
			removeTags: z.array(z.string()).optional(),
			importance: z.number().int().min(1).max(10).optional(),
		}),

		async execute(params, _context) {
			return {
				success: true,
				memoryId: params.memoryId,
				updates: [],
				timestamp: new Date().toISOString(),
			};
		},
	});
