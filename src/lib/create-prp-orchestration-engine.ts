import type { OrchestrationConfig } from '@cortex-os/orchestration';
import { createEngine } from '@cortex-os/orchestration';
import { z } from 'zod';

const configSchema = z
	.object({
		maxConcurrentOrchestrations: z.number().int().positive().optional(),
		defaultStrategy: z.string().optional(),
		planningTimeout: z.number().int().positive().optional(),
		executionTimeout: z.number().int().positive().optional(),
	})
	.passthrough();

export function createPRPOrchestrationEngine(
	config: Partial<OrchestrationConfig> = {},
) {
	return createEngine(configSchema.parse(config));
}
