import { createTool, z } from '../mocks/voltagent-core';

export const createMemoryRetrieveTool = () =>
	createTool({
		id: 'memory-retrieve',
		name: 'memory_retrieve',
		description: 'Retrieve memories from the agent memory system',

		parameters: z.object({
			memoryId: z.string().optional(),
			query: z.string().optional(),
			types: z
				.array(
					z.enum([
						'working',
						'contextual',
						'episodic',
						'semantic',
						'procedural',
					]),
				)
				.optional(),
			tags: z.array(z.string()).optional(),
			limit: z.number().int().min(1).max(50).optional().default(10),
		}),

		async execute(_params, _context) {
			return {
				success: true,
				memories: [],
				count: 0,
				timestamp: new Date().toISOString(),
			};
		},
	});
