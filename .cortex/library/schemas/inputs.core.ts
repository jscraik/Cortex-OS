import { z } from 'zod';

// Core input schema for Cortex-OS neurons
export const CoreInputSchema = z.object({
	task: z.string().min(1, 'Task description is required'),
	context: z.string().optional(),
	history: z
		.array(
			z.object({
				role: z.enum(['user', 'assistant']),
				content: z.string(),
			}),
		)
		.optional(),
	metadata: z.record(z.unknown()).optional(),
});

export type CoreInput = z.infer<typeof CoreInputSchema>;
