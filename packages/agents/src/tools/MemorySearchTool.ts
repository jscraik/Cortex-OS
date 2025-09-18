import { z } from 'zod';
import { createTool } from './mocks/voltagent-core.js';

export const createMemorySearchTool = () =>
	createTool({
		id: 'memory-search',
		name: 'memory_search',
		description:
			'Perform semantic search across memories using various search strategies',

		parameters: z.object({
			query: z.string().min(1),
			strategy: z
				.enum(['semantic', 'keyword', 'hybrid'])
				.optional()
				.default('hybrid'),
			scope: z
				.enum(['all', 'content', 'summary', 'tags', 'metadata'])
				.optional()
				.default('all'),
			types: z
				.array(
					z.enum([
						'working',
						'contextual',
						'episodic',
						'semantic',
						'procedural',
						'declarative',
					]),
				)
				.optional(),
			tags: z.array(z.string()).optional(),
			timeRange: z.number().int().min(1).optional(),
			minScore: z.number().min(0).max(1).optional().default(0.5),
			limit: z.number().int().min(1).max(50).optional().default(10),
		}),

		async execute(
			params: {
				query: string;
				strategy?: 'semantic' | 'keyword' | 'hybrid';
				scope?: 'all' | 'content' | 'summary' | 'tags' | 'metadata';
				types?: Array<
					| 'working'
					| 'contextual'
					| 'episodic'
					| 'semantic'
					| 'procedural'
					| 'declarative'
				>;
				tags?: string[];
				timeRange?: number;
				minScore?: number;
				limit?: number;
			},
			_context: unknown,
		) {
			return {
				success: true,
				results: [],
				totalResults: 0,
				query: params.query,
				timestamp: new Date().toISOString(),
			};
		},
	});
