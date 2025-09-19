import { z } from 'zod';

export const AgentConfigurationSchema = z.object({
	name: z.string().min(1).default('cerebrum'),
	maxConcurrency: z.number().int().positive().max(128),
});
export type AgentConfiguration = z.infer<typeof AgentConfigurationSchema>;

export const AgentStateSchema = z.object({
	status: z.enum(['idle', 'busy', 'error']),
	lastUpdated: z.string().datetime({ offset: true }).optional(),
});
export type AgentState = z.infer<typeof AgentStateSchema>;

export const AgentDescriptorSchema = z.object({
	id: z.string().min(1),
	state: AgentStateSchema,
});

export const AgentPoolSchema = z.object({
	agents: z.array(AgentDescriptorSchema).min(1),
});
export type AgentPool = z.infer<typeof AgentPoolSchema>;

export const AgentErrorSchema = z.object({
	code: z.string().min(1),
	message: z.string().min(1),
	details: z.record(z.unknown()).optional(),
});
export type AgentError = z.infer<typeof AgentErrorSchema>;

export const RecoveryActionSchema = z.object({
	type: z.enum(['restart-and-redistribute', 'retry', 'fallback', 'none']),
	reason: z.string().min(1),
});
export type RecoveryAction = z.infer<typeof RecoveryActionSchema>;

export const ExecutionResultSchema = z.object({
	success: z.boolean(),
	summary: z.string().optional(),
});
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

export const MasterAgentLoopSchema = z.object({});
