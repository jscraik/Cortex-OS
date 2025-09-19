import { z } from 'zod';

export const SubagentConfigSchema = z.object({
	name: z.string().min(1),
	description: z.string().min(1),
	tools: z.array(z.string()).optional(),
	model: z.string().optional(),
	systemPrompt: z.string().min(1),
	scope: z.enum(['project', 'user']),
	capabilities: z.array(z.string().min(1)),
	maxConcurrency: z.number().int().positive().max(64),
	timeout: z.number().int().positive().max(600_000),
});
export type SubagentConfig = z.infer<typeof SubagentConfigSchema>;

export const SubagentRunInputSchema = z.object({
	task: z.string().min(1),
	context: z.record(z.unknown()).optional(),
	budget: z
		.object({ tokens: z.number().int().positive(), ms: z.number().int().positive() })
		.optional(),
});
export type SubagentRunInput = z.infer<typeof SubagentRunInputSchema>;

export const SubagentRunResultSchema = z.object({
	ok: z.boolean(),
	output: z.string().optional(),
	error: z.string().optional(),
	metrics: z
		.object({
			tokensUsed: z.number().int().nonnegative().optional(),
			durationMs: z.number().int().nonnegative().optional(),
		})
		.optional(),
});
export type SubagentRunResult = z.infer<typeof SubagentRunResultSchema>;

export const DelegationOptionsSchema = z.object({
	maxSubagents: z.number().int().positive().max(16).default(1),
	strategy: z.enum(['parallel', 'sequential', 'hybrid']).default('parallel'),
});
export type DelegationOptions = z.infer<typeof DelegationOptionsSchema>;

export const HealthStatusSchema = z.object({
	healthy: z.boolean(),
	responseTime: z.number().int().nonnegative(),
	errorRate: z.number().min(0).max(1),
});
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const SubagentSchema = z.object({
	name: z.string().min(1),
});

export const SubagentToolSchema = z.object({
	name: z.string().regex(/^agent\.[a-z0-9-]+$/),
	description: z.string().min(1),
	schema: z.unknown(),
	// Represent the callable contract as metadata only
	// Implementations will live in feature packages
});

export const SubagentManagerSchema = z.object({});
