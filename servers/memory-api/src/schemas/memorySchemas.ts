import { z } from 'zod';

export const memorySchemas = {
	store: z.object({
		id: z.string().optional(),
		text: z.string(),
		tags: z.array(z.string()).optional(),
		meta: z.record(z.unknown()).optional(),
	}),
	search: z.object({
		query: z.string(),
		topK: z.number().optional(),
		filterTags: z.array(z.string()).optional(),
	}),
	get: z.object({
		id: z.string(),
	}),
	remove: z.object({
		id: z.string(),
	}),
};
