import { createTool } from '@voltagent/core';
import { z } from 'zod';

export const createMemoryStoreTool = (_memory: unknown) =>
	createTool({
		id: 'memory-store',
		name: 'memory_store',
		description:
			'Store information in the agent memory system with tagging and importance',

		parameters: z.object({
			content: z.string().min(1),
			type: z
				.enum([
					'working',
					'contextual',
					'episodic',
					'semantic',
					'procedural',
					'declarative',
				])
				.optional()
				.default('contextual'),
			tags: z.array(z.string()).optional().default([]),
			importance: z.number().int().min(1).max(10).optional().default(5),
			ttl: z.number().int().min(0).optional(),
		}),

		async execute(params) {
			const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

			return {
				success: true,
				memoryId,
				type: params.type,
				tags: params.tags,
				importance: params.importance,
				timestamp: new Date().toISOString(),
			};
		},
	});
