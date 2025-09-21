import { z } from 'zod';

// Request schema for agent execution
export const executeAgentSchema = z.object({
	agentId: z.string().min(1, 'Agent ID cannot be empty'),
	input: z.string().min(1, 'Input cannot be empty'),
	context: z.record(z.any()).optional(),
	options: z.record(z.any()).optional(),
});

export type ExecuteAgentRequest = z.infer<typeof executeAgentSchema>;

// Response schema for agent execution
export const executeAgentResponseSchema = z.object({
	agentId: z.string(),
	response: z.string(),
	timestamp: z.string(),
	status: z.enum(['completed', 'failed', 'pending']),
	error: z.string().optional(),
});

export type ExecuteAgentResponse = z.infer<typeof executeAgentResponseSchema>;

// Health check response schema
export const healthResponseSchema = z.object({
	status: z.enum(['healthy', 'unhealthy', 'degraded']),
	timestamp: z.string(),
	uptime: z.number(),
	version: z.string(),
	checks: z.record(z.any()).optional(),
	metrics: z
		.object({
			requests: z.object({
				total: z.number(),
				success: z.number(),
				error: z.number(),
				latency: z.object({
					avg: z.number(),
					min: z.number(),
					max: z.number(),
					p95: z.number(),
				}),
			}),
			agents: z.number(),
			activeSessions: z.number(),
		})
		.optional(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

// Error response schema
export const errorResponseSchema = z.object({
	error: z.object({
		code: z.number(),
		message: z.string(),
		details: z.any().optional(),
	}),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
