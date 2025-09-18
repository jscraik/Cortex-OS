import { z } from 'zod';

// Core output schema for Cortex-OS neurons
export const CoreOutputSchema = z.object({
	result: z
		.union([z.string(), z.object({}).catchall(z.unknown()), z.array(z.unknown())])
		.optional(),
	metadata: z.record(z.unknown()).optional(),
	confidence: z.number().min(0).max(1).optional(),
	reasoning: z.array(z.string()).optional(),
});

export type CoreOutput = z.infer<typeof CoreOutputSchema>;
