import { z } from 'zod';
import { PRPOrchestrationEngine } from '../../packages/orchestration/src/prp-integration.js';
import type { OrchestrationConfig } from '../../packages/orchestration/src/types.js';

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
): PRPOrchestrationEngine {
  return new PRPOrchestrationEngine(configSchema.parse(config));
}
